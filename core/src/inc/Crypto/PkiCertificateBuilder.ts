import {webcrypto} from 'crypto';
import {DerReader} from './asn1/DerReader.js';
import {Pem} from './asn1/Pem.js';
import {X509Chain} from './asn1/X509Chain.js';
import {X509Der} from './asn1/X509Der.js';
import {X509Ext} from './asn1/X509Ext.js';
import {X509Name} from './asn1/X509Name.js';
import {X509Reader} from './asn1/X509Reader.js';
import {X509SignAlgorithm, X509Signer} from './asn1/X509Signer.js';

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

const CA_KEY_USAGE = [X509Ext.KU_KEY_CERT_SIGN, X509Ext.KU_CRL_SIGN];
const LEAF_KEY_USAGE = [X509Ext.KU_DIGITAL_SIGNATURE];
const SERIAL_BYTES = 16;
const HEX_RADIX = 16;
const OID_EC_PUBLIC_KEY = '1.2.840.10045.2.1';

/**
 * Builds X.509 v3 certificates for the FlyingFish internal PKI (CA tree, mTLS
 * between the Hub and its parts, cluster-node identity). This is the low-level
 * crypto primitive - it knows how to mint keys and sign certificates, but it
 * carries no CA-tree, enrollment or persistence domain logic (those layers,
 * roadmap 9.4.1/9.4.2/9.4.6, sit on top of it).
 *
 * Built on the FlyingFish own PKI library (own-pki-lib slice 7) — no third-party
 * X.509 dependency. Public TLS for internet-facing domains stays with Let's
 * Encrypt; this PKI is for internal/private trust only (PKI-Design, "Abgrenzung").
 */
export class PkiCertificateBuilder {

    /**
     * The own-lib signature algorithm for a key algorithm.
     * @param algorithm - the key algorithm
     */
    private static _signAlgorithm(algorithm: PkiKeyAlgorithm): X509SignAlgorithm {
        return algorithm === PkiKeyAlgorithm.p256 ? 'p256' : 'ed25519';
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
        const publicDer = new Uint8Array(await webcrypto.subtle.exportKey('spki', keyPair.publicKey));
        const privateDer = new Uint8Array(await webcrypto.subtle.exportKey('pkcs8', keyPair.privateKey));

        return {
            publicKey: Pem.encode('PUBLIC KEY', publicDer),
            privateKey: Pem.encode('PRIVATE KEY', privateDer)
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
        return webcrypto.subtle.importKey(
            'pkcs8',
            Pem.decode(pem),
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
        const subject = X509Der.distinguishedName(X509Name.parse(options.subject));
        const spki = new Uint8Array(await webcrypto.subtle.exportKey('spki', keyPair.publicKey));

        const extensions = X509Der.extensions([
            X509Ext.basicConstraints(true, options.pathLength, true),
            X509Ext.keyUsage(CA_KEY_USAGE, true),
            X509Ext.subjectKeyIdentifier(await X509Ext.keyIdentifier(keyPair.publicKey))
        ]);

        return PkiCertificateBuilder._sign(
            {issuer: subject, subject: subject, spki: spki, extensions: extensions, options: options},
            keyPair.privateKey,
            algorithm
        );
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
        const issuerDer = Pem.decode(issuer.certificate);
        const subject = X509Der.distinguishedName(X509Name.parse(options.subject));
        const spki = new Uint8Array(await webcrypto.subtle.exportKey('spki', subjectPublicKey));

        const items = [
            X509Ext.basicConstraints(true, options.pathLength, true),
            X509Ext.keyUsage(CA_KEY_USAGE, true),
            X509Ext.subjectKeyIdentifier(await X509Ext.keyIdentifier(subjectPublicKey)),
            X509Ext.authorityKeyIdentifier(await X509Ext.keyIdentifierFromSpki(X509Reader.subjectPublicKeyInfo(issuerDer)))
        ];

        const nameConstraints = PkiCertificateBuilder._nameConstraints(options.nameConstraints);

        if (nameConstraints !== null) {
            items.push(nameConstraints);
        }

        return PkiCertificateBuilder._sign(
            {
                issuer: X509Reader.subjectName(issuerDer),
                subject: subject,
                spki: spki,
                extensions: X509Der.extensions(items),
                options: options
            },
            issuer.privateKey,
            algorithm
        );
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
        const issuerDer = Pem.decode(issuer.certificate);
        const subject = X509Der.distinguishedName(X509Name.parse(options.subject));
        const spki = new Uint8Array(await webcrypto.subtle.exportKey('spki', subjectPublicKey));

        const items = [
            X509Ext.basicConstraints(false, undefined, true),
            X509Ext.keyUsage(LEAF_KEY_USAGE, true),
            X509Ext.subjectKeyIdentifier(await X509Ext.keyIdentifier(subjectPublicKey)),
            X509Ext.authorityKeyIdentifier(await X509Ext.keyIdentifierFromSpki(X509Reader.subjectPublicKeyInfo(issuerDer)))
        ];

        const eku: string[] = [];

        if (options.clientAuth ?? true) {
            eku.push(X509Ext.EKU_CLIENT_AUTH);
        }

        if (options.serverAuth ?? true) {
            eku.push(X509Ext.EKU_SERVER_AUTH);
        }

        if (eku.length > 0) {
            items.push(X509Ext.extendedKeyUsage(eku, false));
        }

        if (options.san && options.san.length > 0) {
            items.push(X509Ext.subjectAltName(options.san.map((entry) => ({type: entry.type, value: entry.value}))));
        }

        return PkiCertificateBuilder._sign(
            {
                issuer: X509Reader.subjectName(issuerDer),
                subject: subject,
                spki: spki,
                extensions: X509Der.extensions(items),
                options: options
            },
            issuer.privateKey,
            algorithm
        );
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
        const spki = new Uint8Array(await webcrypto.subtle.exportKey('spki', keyPair.publicKey));

        const csr = await X509Signer.signCsr(
            X509Der.distinguishedName(X509Name.parse(subject)),
            spki,
            keyPair.privateKey,
            PkiCertificateBuilder._signAlgorithm(algorithm)
        );

        return Pem.encode(Pem.CERTIFICATE_REQUEST, csr);
    }

    /**
     * Verify a CSR's self-signature, i.e. that the requester actually holds the
     * private key for the public key in the CSR (proof of possession).
     * @param csr - the CSR PEM
     */
    public static async verifyCsr(csr: string): Promise<boolean> {
        return X509Signer.verifyCsr(Pem.decode(csr, Pem.CERTIFICATE_REQUEST));
    }

    /**
     * Extract the public key from a CSR as a WebCrypto key (for signing the
     * issued certificate against it).
     * @param csr - the CSR PEM
     */
    public static async getCsrPublicKey(csr: string): Promise<webcrypto.CryptoKey> {
        return PkiCertificateBuilder._importPublicKey(
            X509Reader.csrSubjectPublicKeyInfo(Pem.decode(csr, Pem.CERTIFICATE_REQUEST))
        );
    }

    /**
     * Get the requested subject distinguished name from a CSR.
     * @param csr - the CSR PEM
     */
    public static getCsrSubject(csr: string): string {
        return X509Name.format(X509Reader.csrSubjectAttributes(Pem.decode(csr, Pem.CERTIFICATE_REQUEST)));
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
        return X509Signer.verifyIssuedBy(Pem.decode(certificate), Pem.decode(issuerCertificate));
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
        const chain = await X509Chain.build(
            Pem.decode(leafCertificate),
            caCertificates.map((pem) => Pem.decode(pem))
        );

        return chain.map((der) => Pem.encode(Pem.CERTIFICATE, der));
    }

    /**
     * Cross-sign a CA: re-issue an existing CA certificate's subject + public key
     * under a different issuer, so verifiers that trust the issuer can build a
     * path to the subject CA (own-PKI epic 9.4.3-E, root rollover). Used to have
     * the OLD root vouch for the NEW root's key during a root key rollover. The
     * cross certificate keeps the subject's validity window and is itself a CA
     * certificate (BasicConstraints CA:true).
     * @param subjectCertificate - the CA certificate to cross-sign (its subject +
     *                             public key are re-issued)
     * @param issuer - the cross-signing CA (certificate + private key)
     * @param algorithm - the issuer's signature algorithm (Ed25519 by default)
     */
    public static async createCrossSigned(
        subjectCertificate: string,
        issuer: PkiIssuer,
        algorithm: PkiKeyAlgorithm = PkiKeyAlgorithm.ed25519
    ): Promise<string> {
        const subjectDer = Pem.decode(subjectCertificate);
        const issuerDer = Pem.decode(issuer.certificate);
        const subjectSpki = X509Reader.subjectPublicKeyInfo(subjectDer);

        const extensions = X509Der.extensions([
            X509Ext.basicConstraints(true, undefined, true),
            X509Ext.keyUsage(CA_KEY_USAGE, true),
            X509Ext.subjectKeyIdentifier(await X509Ext.keyIdentifierFromSpki(subjectSpki)),
            X509Ext.authorityKeyIdentifier(await X509Ext.keyIdentifierFromSpki(X509Reader.subjectPublicKeyInfo(issuerDer)))
        ]);

        const tbs = X509Der.tbsCertificate({
            serialNumber: PkiCertificateBuilder._randomSerialBytes(),
            signatureAlgorithm: X509Signer.signatureAlgorithm(PkiCertificateBuilder._signAlgorithm(algorithm)),
            issuer: X509Reader.subjectName(issuerDer),
            notBefore: new Date(),
            notAfter: X509Reader.validity(subjectDer).notAfter,
            subject: X509Reader.subjectName(subjectDer),
            subjectPublicKeyInfo: subjectSpki,
            extensions: extensions
        });

        return Pem.encode(Pem.CERTIFICATE, await X509Signer.signCertificate(tbs, issuer.privateKey, PkiCertificateBuilder._signAlgorithm(algorithm)));
    }

    /**
     * Assemble the TBSCertificate for the common create* paths, sign it and wrap
     * the result in a PEM certificate.
     * @param parts - issuer/subject Names, SPKI, extensions and validity options
     * @param signingKey - the issuer's private key
     * @param algorithm - the signature algorithm
     */
    private static async _sign(
        parts: {
            issuer: Uint8Array;
            subject: Uint8Array;
            spki: Uint8Array;
            extensions: Uint8Array;
            options: {validityDays: number; serialNumber?: string;};
        },
        signingKey: webcrypto.CryptoKey,
        algorithm: PkiKeyAlgorithm
    ): Promise<string> {
        const signAlgorithm = PkiCertificateBuilder._signAlgorithm(algorithm);

        const tbs = X509Der.tbsCertificate({
            serialNumber: PkiCertificateBuilder._serialBytes(parts.options.serialNumber),
            signatureAlgorithm: X509Signer.signatureAlgorithm(signAlgorithm),
            issuer: parts.issuer,
            notBefore: new Date(),
            notAfter: PkiCertificateBuilder._notAfter(parts.options.validityDays),
            subject: parts.subject,
            subjectPublicKeyInfo: parts.spki,
            extensions: parts.extensions
        });

        return Pem.encode(Pem.CERTIFICATE, await X509Signer.signCertificate(tbs, signingKey, signAlgorithm));
    }

    /**
     * Import a public key from its SubjectPublicKeyInfo, detecting the algorithm
     * from the SPKI (Ed25519 or ECDSA P-256).
     * @param spki - the SubjectPublicKeyInfo DER
     */
    private static _importPublicKey(spki: Uint8Array): Promise<webcrypto.CryptoKey> {
        const algorithmOid = DerReader.toOidString(DerReader.parse(spki).children[0].children[0]);
        const params: webcrypto.EcKeyImportParams | webcrypto.Algorithm = algorithmOid === OID_EC_PUBLIC_KEY
            ? {name: 'ECDSA', namedCurve: 'P-256'}
            : {name: 'Ed25519'};

        return webcrypto.subtle.importKey('spki', spki, params, true, ['verify']);
    }

    /**
     * Build a NameConstraints extension from permitted DNS/URI subtrees, or null
     * when nothing is constrained.
     * @param constraints - the permitted name spaces
     */
    private static _nameConstraints(constraints?: PkiNameConstraints): Uint8Array | null {
        const dns = constraints?.permittedDns ?? [];
        const uri = constraints?.permittedUri ?? [];

        if (dns.length === 0 && uri.length === 0) {
            return null;
        }

        return X509Ext.nameConstraints(dns, uri, true);
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
     * The serial-number magnitude bytes from an optional hex string, or a fresh
     * random 16-byte serial.
     * @param serialHex - the serial number as a hex string, if given
     */
    private static _serialBytes(serialHex?: string): Uint8Array {
        if (serialHex === undefined) {
            return PkiCertificateBuilder._randomSerialBytes();
        }

        const pairs = serialHex.match(/.{1,2}/gu) ?? [];

        return Uint8Array.from(pairs.map((pair) => parseInt(pair, HEX_RADIX)));
    }

    /**
     * A cryptographically random 16-byte serial number.
     */
    private static _randomSerialBytes(): Uint8Array {
        return webcrypto.getRandomValues(new Uint8Array(SERIAL_BYTES));
    }

}