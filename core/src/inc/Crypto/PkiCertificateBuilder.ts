// reflect-metadata is required by @peculiar/x509 (it uses tsyringe internally).
// TypeORM pulls it in too, but importing it here keeps this module self-contained.
import 'reflect-metadata';
import {webcrypto} from 'crypto';
import {AsnConvert} from '@peculiar/asn1-schema';
import {
    GeneralName,
    GeneralSubtree,
    GeneralSubtrees,
    NameConstraints,
    id_ce_nameConstraints
} from '@peculiar/asn1-x509';
import * as x509 from '@peculiar/x509';

/**
 * Supported key algorithms for the FlyingFish PKI. Ed25519 is the primary
 * choice (fast, small keys/signatures); ECDSA P-256 is the compatibility
 * fallback. RSA is intentionally not offered here - it lives in the legacy
 * CertificateHelper and is only kept where external systems require it.
 * (PKI-Design 2026-08-23, decision #4.)
 */
export enum PkiKeyAlgorithm {
    ed25519 = 'Ed25519',
    p256 = 'P-256'
}

/**
 * An in-memory WebCrypto key pair (private key never leaves the process unless
 * explicitly exported via exportKeyPair).
 */
export type PkiKeyPair = {
    privateKey: webcrypto.CryptoKey;
    publicKey: webcrypto.CryptoKey;
};

/**
 * A key pair serialized to PEM (public: SPKI, private: PKCS#8).
 */
export type PkiKeyPairPem = {
    publicKey: string;
    privateKey: string;
};

/**
 * Subject-alternative-name entry types the builder understands.
 * - dns:   a DNS host name
 * - ip:    an IPv4 or IPv6 literal (dual-stack, PKI-Design decision #7)
 * - url:   a URI, e.g. the stable logical identity flyingfish://node/<uuid>
 * - email: an rfc822 address
 */
export type PkiSanType = 'dns' | 'ip' | 'url' | 'email';

/**
 * A single subject-alternative-name entry.
 */
export type PkiSanEntry = {
    type: PkiSanType;
    value: string;
};

/**
 * Name constraints for a CA certificate. They limit the name space a CA (and
 * everything below it) is allowed to issue for, so one intermediate cannot mint
 * certificates outside its purpose (PKI-Design, "Name Constraints auf
 * Intermediates"). Encoded as permitted subtrees; an empty/omitted list means
 * unconstrained.
 */
export type PkiNameConstraints = {
    /**
     * Permitted DNS name suffixes, e.g. '.service.flyingfish.internal'.
     */
    permittedDns?: string[];

    /**
     * Permitted URI namespaces, e.g. 'flyingfish://service/'.
     */
    permittedUri?: string[];
};

/**
 * The material needed to sign a child certificate: the issuer's certificate
 * (PEM, provides the issuer DN and the key identifier the child points at) and
 * the issuer's private key.
 */
export type PkiIssuer = {
    certificate: string;
    privateKey: webcrypto.CryptoKey;
};

/**
 * Options for a CA certificate (root or intermediate).
 */
export type PkiCaCertOptions = {
    /**
     * The subject distinguished name, RFC 4514 form, e.g.
     * 'CN=FlyingFish Root CA, O=FlyingFish'.
     */
    subject: string;

    /**
     * Validity in days from now (Root 10-20y, Intermediate 1-3y per design).
     */
    validityDays: number;

    /**
     * basicConstraints pathLenConstraint - how many further CA levels may sit
     * below this one. Undefined means unconstrained.
     */
    pathLength?: number;

    /**
     * Optional name constraints restricting the name space this CA may issue
     * for. Only meaningful on intermediates (a self-signed root is trusted as
     * an anchor, not constrained by its own extension).
     */
    nameConstraints?: PkiNameConstraints;

    /**
     * Optional serial number as a hex string. A cryptographically random
     * 16-byte serial is generated when omitted.
     */
    serialNumber?: string;
};

/**
 * Options for an end-entity (leaf) certificate.
 */
export type PkiLeafCertOptions = {
    /**
     * The subject distinguished name, RFC 4514 form.
     */
    subject: string;

    /**
     * Validity in days from now (Node 30d, Service 7d, Device 90d per design).
     */
    validityDays: number;

    /**
     * Subject alternative names. The stable logical identity belongs here as a
     * url SAN (flyingfish://node/<uuid>).
     */
    san?: PkiSanEntry[];

    /**
     * Include the clientAuth EKU (default true) - the mTLS client side.
     */
    clientAuth?: boolean;

    /**
     * Include the serverAuth EKU (default true) - the mTLS server side.
     */
    serverAuth?: boolean;

    /**
     * Optional serial number as a hex string. A cryptographically random
     * 16-byte serial is generated when omitted.
     */
    serialNumber?: string;
};

// The WebCrypto provider @peculiar/x509 signs/verifies with. Node's WebCrypto
// supports Ed25519 and ECDSA P-256 natively, so no polyfill provider is needed.
x509.cryptoProvider.set(webcrypto as unknown as Crypto);

/**
 * Builds X.509 v3 certificates for the FlyingFish internal PKI (CA tree, mTLS
 * between the Hub and its parts, cluster-node identity). This is the low-level
 * crypto primitive - it knows how to mint keys and sign certificates, but it
 * carries no CA-tree, enrollment or persistence domain logic (those layers,
 * roadmap 9.4.1/9.4.2/9.4.6, sit on top of it).
 *
 * Public TLS for internet-facing domains stays with Let's Encrypt; this PKI is
 * for internal/private trust only (PKI-Design, "Abgrenzung").
 */
export class PkiCertificateBuilder {

    /**
     * The signature algorithm each key algorithm signs with.
     * @param algorithm - the key algorithm
     */
    private static _signingAlgorithm(algorithm: PkiKeyAlgorithm): webcrypto.EcdsaParams | webcrypto.Algorithm {
        if (algorithm === PkiKeyAlgorithm.p256) {
            return {
                name: 'ECDSA',
                hash: 'SHA-256'
            };
        }

        return {name: PkiKeyAlgorithm.ed25519};
    }

    /**
     * The keygen parameters for a key algorithm.
     * @param algorithm - the key algorithm
     */
    private static _keyGenAlgorithm(algorithm: PkiKeyAlgorithm): webcrypto.EcKeyGenParams | webcrypto.Algorithm {
        if (algorithm === PkiKeyAlgorithm.p256) {
            return {
                name: 'ECDSA',
                namedCurve: 'P-256'
            };
        }

        return {name: PkiKeyAlgorithm.ed25519};
    }

    /**
     * Generate a fresh key pair. The private key is extractable so it can be
     * exported (and, for CA keys, encrypted at rest by the caller).
     * @param algorithm - the key algorithm, Ed25519 by default
     */
    public static async generateKeyPair(
        algorithm: PkiKeyAlgorithm = PkiKeyAlgorithm.ed25519
    ): Promise<PkiKeyPair> {
        const keys = await webcrypto.subtle.generateKey(
            PkiCertificateBuilder._keyGenAlgorithm(algorithm) as webcrypto.EcKeyGenParams,
            true,
            ['sign', 'verify']
        ) as webcrypto.CryptoKeyPair;

        return {
            privateKey: keys.privateKey,
            publicKey: keys.publicKey
        };
    }

    /**
     * Export a key pair to PEM (public SPKI, private PKCS#8).
     * @param keyPair - the key pair to export
     */
    public static async exportKeyPair(keyPair: PkiKeyPair): Promise<PkiKeyPairPem> {
        const publicDer = await webcrypto.subtle.exportKey('spki', keyPair.publicKey);
        const privateDer = await webcrypto.subtle.exportKey('pkcs8', keyPair.privateKey);

        return {
            publicKey: PkiCertificateBuilder._toPem(publicDer, 'PUBLIC KEY'),
            privateKey: PkiCertificateBuilder._toPem(privateDer, 'PRIVATE KEY')
        };
    }

    /**
     * Import a PKCS#8 PEM private key for signing.
     * @param pem - the PKCS#8 PEM private key
     * @param algorithm - the key algorithm the key was generated with
     */
    public static async importPrivateKey(
        pem: string,
        algorithm: PkiKeyAlgorithm = PkiKeyAlgorithm.ed25519
    ): Promise<webcrypto.CryptoKey> {
        const der = PkiCertificateBuilder._fromPem(pem);

        return webcrypto.subtle.importKey(
            'pkcs8',
            der,
            PkiCertificateBuilder._keyGenAlgorithm(algorithm) as webcrypto.EcKeyImportParams,
            true,
            ['sign']
        );
    }

    /**
     * Create a self-signed Root CA certificate. The root sits at the top of the
     * tree, signs only intermediates, and its key is meant to be held offline
     * (PKI-Design decision #2).
     * @param options - the CA options
     * @param keyPair - the root's own key pair (caller controls key storage)
     * @param algorithm - the signature algorithm, Ed25519 by default
     */
    public static async createRootCa(
        options: PkiCaCertOptions,
        keyPair: PkiKeyPair,
        algorithm: PkiKeyAlgorithm = PkiKeyAlgorithm.ed25519
    ): Promise<string> {
        // A CA signs certificates and CRLs. keyCertSign and cRLSign are disjoint
        // bits, so combining them is a bitwise OR by definition.
        // eslint-disable-next-line no-bitwise
        const caKeyUsage = x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign;

        const cert = await x509.X509CertificateGenerator.createSelfSigned({
            serialNumber: options.serialNumber ?? PkiCertificateBuilder._randomSerial(),
            name: options.subject,
            notBefore: new Date(),
            notAfter: PkiCertificateBuilder._notAfter(options.validityDays),
            keys: keyPair as unknown as webcrypto.CryptoKeyPair,
            signingAlgorithm: PkiCertificateBuilder._signingAlgorithm(algorithm),
            extensions: [
                new x509.BasicConstraintsExtension(true, options.pathLength, true),
                new x509.KeyUsagesExtension(caKeyUsage, true),
                await x509.SubjectKeyIdentifierExtension.create(keyPair.publicKey)
            ]
        });

        return cert.toString('pem');
    }

    /**
     * Create an Intermediate CA certificate signed by a parent CA. Intermediates
     * are separated by purpose (Cluster/Service/Device) so one compromise stays
     * contained.
     * @param options - the CA options
     * @param subjectPublicKey - the intermediate's own public key
     * @param issuer - the signing parent CA (certificate + private key)
     * @param algorithm - the signature algorithm, Ed25519 by default
     */
    public static async createIntermediateCa(
        options: PkiCaCertOptions,
        subjectPublicKey: webcrypto.CryptoKey,
        issuer: PkiIssuer,
        algorithm: PkiKeyAlgorithm = PkiKeyAlgorithm.ed25519
    ): Promise<string> {
        const issuerCert = new x509.X509Certificate(issuer.certificate);

        // A CA signs certificates and CRLs. keyCertSign and cRLSign are disjoint
        // bits, so combining them is a bitwise OR by definition.
        // eslint-disable-next-line no-bitwise
        const caKeyUsage = x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign;

        const extensions: x509.Extension[] = [
            new x509.BasicConstraintsExtension(true, options.pathLength, true),
            new x509.KeyUsagesExtension(caKeyUsage, true),
            await x509.SubjectKeyIdentifierExtension.create(subjectPublicKey),
            await x509.AuthorityKeyIdentifierExtension.create(issuerCert.publicKey)
        ];

        const nameConstraints = PkiCertificateBuilder._nameConstraintsExtension(options.nameConstraints);

        if (nameConstraints !== null) {
            extensions.push(nameConstraints);
        }

        const cert = await x509.X509CertificateGenerator.create({
            serialNumber: options.serialNumber ?? PkiCertificateBuilder._randomSerial(),
            subject: options.subject,
            issuer: issuerCert.subject,
            notBefore: new Date(),
            notAfter: PkiCertificateBuilder._notAfter(options.validityDays),
            signingKey: issuer.privateKey as unknown as webcrypto.CryptoKey,
            publicKey: subjectPublicKey as unknown as webcrypto.CryptoKey,
            signingAlgorithm: PkiCertificateBuilder._signingAlgorithm(algorithm),
            extensions: extensions
        });

        return cert.toString('pem');
    }

    /**
     * Create an end-entity (leaf) certificate signed by a CA. Leaf certs are
     * short-lived and carry the stable logical identity as a url SAN plus the
     * mTLS EKUs.
     * @param options - the leaf options
     * @param subjectPublicKey - the leaf's own public key
     * @param issuer - the signing CA (certificate + private key)
     * @param algorithm - the signature algorithm, Ed25519 by default
     */
    public static async createLeafCertificate(
        options: PkiLeafCertOptions,
        subjectPublicKey: webcrypto.CryptoKey,
        issuer: PkiIssuer,
        algorithm: PkiKeyAlgorithm = PkiKeyAlgorithm.ed25519
    ): Promise<string> {
        const issuerCert = new x509.X509Certificate(issuer.certificate);

        const eku: x509.ExtendedKeyUsageType[] = [];

        if (options.clientAuth ?? true) {
            eku.push(x509.ExtendedKeyUsage.clientAuth);
        }

        if (options.serverAuth ?? true) {
            eku.push(x509.ExtendedKeyUsage.serverAuth);
        }

        const extensions: x509.Extension[] = [
            new x509.BasicConstraintsExtension(false, undefined, true),
            new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature, true),
            await x509.SubjectKeyIdentifierExtension.create(subjectPublicKey),
            await x509.AuthorityKeyIdentifierExtension.create(issuerCert.publicKey)
        ];

        if (eku.length > 0) {
            extensions.push(new x509.ExtendedKeyUsageExtension(eku, false));
        }

        if (options.san && options.san.length > 0) {
            extensions.push(
                new x509.SubjectAlternativeNameExtension(
                    options.san.map((entry) => ({
                        type: entry.type,
                        value: entry.value
                    }))
                )
            );
        }

        const cert = await x509.X509CertificateGenerator.create({
            serialNumber: options.serialNumber ?? PkiCertificateBuilder._randomSerial(),
            subject: options.subject,
            issuer: issuerCert.subject,
            notBefore: new Date(),
            notAfter: PkiCertificateBuilder._notAfter(options.validityDays),
            signingKey: issuer.privateKey as unknown as webcrypto.CryptoKey,
            publicKey: subjectPublicKey as unknown as webcrypto.CryptoKey,
            signingAlgorithm: PkiCertificateBuilder._signingAlgorithm(algorithm),
            extensions: extensions
        });

        return cert.toString('pem');
    }

    /**
     * Create a PKCS#10 certificate signing request (CSR). A node generates its
     * key pair locally and produces a CSR that proves possession of the private
     * key (the CSR is self-signed); only the CSR travels to the CA, the private
     * key never leaves the node (EST simpleenroll, PKI-Design §3).
     * @param subject - the requested subject distinguished name, RFC 4514 form
     * @param keyPair - the requester's own key pair
     * @param algorithm - the signature algorithm, Ed25519 by default
     */
    public static async createCsr(
        subject: string,
        keyPair: PkiKeyPair,
        algorithm: PkiKeyAlgorithm = PkiKeyAlgorithm.ed25519
    ): Promise<string> {
        const csr = await x509.Pkcs10CertificateRequestGenerator.create({
            name: subject,
            keys: keyPair as unknown as webcrypto.CryptoKeyPair,
            signingAlgorithm: PkiCertificateBuilder._signingAlgorithm(algorithm)
        });

        return csr.toString('pem');
    }

    /**
     * Verify a CSR's self-signature, i.e. that the requester actually holds the
     * private key for the public key in the CSR (proof of possession).
     * @param csr - the CSR PEM
     */
    public static async verifyCsr(csr: string): Promise<boolean> {
        return new x509.Pkcs10CertificateRequest(csr).verify();
    }

    /**
     * Extract the public key from a CSR as a WebCrypto key (for signing the
     * issued certificate against it).
     * @param csr - the CSR PEM
     */
    public static async getCsrPublicKey(csr: string): Promise<webcrypto.CryptoKey> {
        const publicKey = await new x509.Pkcs10CertificateRequest(csr).publicKey.export();

        return publicKey as unknown as webcrypto.CryptoKey;
    }

    /**
     * Get the requested subject distinguished name from a CSR.
     * @param csr - the CSR PEM
     */
    public static getCsrSubject(csr: string): string {
        return new x509.Pkcs10CertificateRequest(csr).subject;
    }

    /**
     * Verify that a certificate was signed by the given issuer (signature only -
     * this does not check validity dates, revocation or the full chain).
     * @param certificate - the certificate PEM to check
     * @param issuerCertificate - the alleged issuer's certificate PEM
     */
    public static async verifyIssuedBy(
        certificate: string,
        issuerCertificate: string
    ): Promise<boolean> {
        const cert = new x509.X509Certificate(certificate);
        const issuer = new x509.X509Certificate(issuerCertificate);

        return cert.verify({
            publicKey: await issuer.publicKey.export(),
            signatureOnly: true
        });
    }

    /**
     * Build the certificate chain from a leaf up towards its root, using the
     * given pool of CA certificates. Returns the ordered chain (leaf first).
     * @param leafCertificate - the leaf certificate PEM
     * @param caCertificates - the pool of CA certificate PEMs to chain through
     */
    public static async buildChain(
        leafCertificate: string,
        caCertificates: string[]
    ): Promise<string[]> {
        const leaf = new x509.X509Certificate(leafCertificate);
        const cas = caCertificates.map((pem) => new x509.X509Certificate(pem));

        const builder = new x509.X509ChainBuilder({certificates: cas});
        const chain = await builder.build(leaf);

        return chain.map((cert) => cert.toString('pem'));
    }

    /**
     * Build a NameConstraints extension (critical) from permitted DNS/URI
     * subtrees, or null when nothing is constrained.
     * @param constraints - the permitted name spaces
     */
    private static _nameConstraintsExtension(
        constraints?: PkiNameConstraints
    ): x509.Extension | null {
        if (!constraints) {
            return null;
        }

        const subtrees: GeneralSubtree[] = [];

        for (const dns of constraints.permittedDns ?? []) {
            subtrees.push(new GeneralSubtree({base: new GeneralName({dNSName: dns})}));
        }

        for (const uri of constraints.permittedUri ?? []) {
            subtrees.push(new GeneralSubtree({base: new GeneralName({uniformResourceIdentifier: uri})}));
        }

        if (subtrees.length === 0) {
            return null;
        }

        const nameConstraints = new NameConstraints({
            permittedSubtrees: new GeneralSubtrees(subtrees)
        });

        return new x509.Extension(
            id_ce_nameConstraints,
            true,
            AsnConvert.serialize(nameConstraints)
        );
    }

    /**
     * notAfter date, validityDays from now.
     * @param validityDays - the number of days the certificate is valid for
     */
    private static _notAfter(validityDays: number): Date {
        const notAfter = new Date();
        notAfter.setDate(notAfter.getDate() + validityDays);

        return notAfter;
    }

    /**
     * A cryptographically random 16-byte serial number as a hex string.
     */
    private static _randomSerial(): string {
        const bytes = webcrypto.getRandomValues(new Uint8Array(16));

        return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Wrap DER bytes in a PEM envelope.
     * @param der - the DER-encoded bytes
     * @param label - the PEM label, e.g. 'PRIVATE KEY'
     */
    private static _toPem(der: ArrayBuffer, label: string): string {
        const base64 = Buffer.from(der).toString('base64');
        const lines = base64.match(/.{1,64}/gu) ?? [];

        return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
    }

    /**
     * Strip a PEM envelope back to DER bytes.
     * @param pem - the PEM string
     */
    private static _fromPem(pem: string): Uint8Array {
        const base64 = pem
        .replace(/-----BEGIN [^-]+-----/u, '')
        .replace(/-----END [^-]+-----/u, '')
        .replace(/\s+/gu, '');

        return new Uint8Array(Buffer.from(base64, 'base64'));
    }

}