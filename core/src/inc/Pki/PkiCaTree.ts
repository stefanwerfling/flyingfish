import {Pem} from '../Crypto/asn1/Pem.js';
import {X509Name} from '../Crypto/asn1/X509Name.js';
import {X509Reader} from '../Crypto/asn1/X509Reader.js';
import {
    PkiCaCertOptions,
    PkiCertificateBuilder,
    PkiIssuer,
    PkiKeyAlgorithm,
    PkiKeyPairPem,
    PkiLeafCertOptions
} from '../Crypto/PkiCertificateBuilder.js';

/**
 * The purpose an Intermediate CA is dedicated to. Separating intermediates by
 * purpose (each with its own name constraints) keeps one compromise contained
 * to that purpose (PKI-Design, "Trennung nach Zweck").
 * - cluster: cluster-node identity / membership (mTLS between nodes)
 * - service: internal Hub <-> parts mTLS (replaces the shared secret)
 * - device:  client-/device certificates (SSO, mTLS login)
 */
export enum PkiCaPurpose {
    cluster = 'cluster',
    service = 'service',
    device = 'device'
}

/**
 * One CA in the tree: the certificate plus its own key pair, all PEM. Higher
 * layers (9.4.6) decide how the private keys are stored - the root's offline,
 * the intermediates' encrypted at rest.
 */
export type PkiCaNode = {
    certificate: string;
    privateKey: string;
    publicKey: string;
};

/**
 * A freshly issued leaf certificate together with its own key pair.
 */
export type PkiIssuedLeaf = {
    certificate: string;
    keyPair: PkiKeyPairPem;
};

/**
 * The built CA tree: one offline Root plus one Intermediate per purpose.
 */
export type PkiCaTreeResult = {
    algorithm: PkiKeyAlgorithm;
    root: PkiCaNode;
    intermediates: Record<PkiCaPurpose, PkiCaNode>;
};

/**
 * The result of a root rollover: the new self-signed Root plus the cross
 * certificate (the old Root's key vouching for the new Root's key) that lets
 * verifiers still trusting the old Root build a path to the new one.
 */
export type PkiRootRolloverResult = {
    root: PkiCaNode;
    crossCertificate: string;
};

/**
 * Options for building a CA tree.
 */
export type PkiCaTreeOptions = {
    /**
     * The organization (O=) put into every distinguished name. Default
     * 'FlyingFish'.
     */
    organization?: string;

    /**
     * Root CA validity in days. Default ~15 years (design: Root 10-20y).
     */
    rootValidityDays?: number;

    /**
     * Intermediate CA validity in days. Default ~2 years (design: 1-3y).
     */
    intermediateValidityDays?: number;

    /**
     * The key/signature algorithm for every CA in the tree. Default Ed25519.
     */
    algorithm?: PkiKeyAlgorithm;
};

/**
 * Per-purpose fixed configuration: the CA common name and the URI namespace
 * the intermediate is name-constrained to.
 */
type PkiPurposeConfig = {
    commonName: string;
    uriNamespace: string;
};

const PURPOSE_CONFIG: Record<PkiCaPurpose, PkiPurposeConfig> = {
    [PkiCaPurpose.cluster]: {
        commonName: 'FlyingFish Cluster Intermediate CA',
        uriNamespace: 'flyingfish://cluster/'
    },
    [PkiCaPurpose.service]: {
        commonName: 'FlyingFish Service Intermediate CA',
        uriNamespace: 'flyingfish://service/'
    },
    [PkiCaPurpose.device]: {
        commonName: 'FlyingFish Device Intermediate CA',
        uriNamespace: 'flyingfish://device/'
    }
};

const DEFAULT_ROOT_VALIDITY_DAYS = 365 * 15;
const DEFAULT_INTERMEDIATE_VALIDITY_DAYS = 365 * 2;
const DEFAULT_ORGANIZATION = 'FlyingFish';

/**
 * Builds the FlyingFish CA hierarchy on top of the PkiCertificateBuilder crypto
 * primitive: a self-signed offline Root that only signs Intermediates, and one
 * Intermediate per purpose (Cluster/Service/Device), each name-constrained to
 * its own namespace. This is the in-memory CA-tree ceremony; persistence and
 * the online issuance container come later (roadmap 9.4.6), enrollment in
 * 9.4.2. Public TLS stays with Let's Encrypt - this tree is internal trust.
 */
export class PkiCaTree {

    /**
     * Build a complete CA tree: Root + one Intermediate per purpose.
     * @param options - the tree options
     */
    public static async create(options: PkiCaTreeOptions = {}): Promise<PkiCaTreeResult> {
        const organization = options.organization ?? DEFAULT_ORGANIZATION;
        const algorithm = options.algorithm ?? PkiKeyAlgorithm.ed25519;

        // Root CA: self-signed, holds one level of CA below it (the purpose
        // intermediates), so pathLength 1.
        const rootKeys = await PkiCertificateBuilder.generateKeyPair(algorithm);
        const rootCert = await PkiCertificateBuilder.createRootCa({
            subject: `CN=FlyingFish Root CA, O=${organization}`,
            validityDays: options.rootValidityDays ?? DEFAULT_ROOT_VALIDITY_DAYS,
            pathLength: 1
        }, rootKeys, algorithm);

        const rootPem = await PkiCertificateBuilder.exportKeyPair(rootKeys);

        const root: PkiCaNode = {
            certificate: rootCert,
            privateKey: rootPem.privateKey,
            publicKey: rootPem.publicKey
        };

        const rootIssuer: PkiIssuer = {
            certificate: rootCert,
            privateKey: rootKeys.privateKey
        };

        const intermediateValidityDays = options.intermediateValidityDays ?? DEFAULT_INTERMEDIATE_VALIDITY_DAYS;
        const purposes = Object.values(PkiCaPurpose);

        // The purpose intermediates are independent of each other, so sign them
        // concurrently rather than one after another.
        const nodes = await Promise.all(purposes.map((purpose) => PkiCaTree._createIntermediate(
            purpose,
            organization,
            intermediateValidityDays,
            rootIssuer,
            algorithm
        )));

        const intermediates = {} as Record<PkiCaPurpose, PkiCaNode>;

        purposes.forEach((purpose, index) => {
            intermediates[purpose] = nodes[index];
        });

        return {
            algorithm: algorithm,
            root: root,
            intermediates: intermediates
        };
    }

    /**
     * Issue an end-entity (leaf) certificate under a CA node (typically a
     * purpose intermediate). The leaf gets its own fresh key pair.
     * @param issuer - the signing CA node (certificate + PEM private key)
     * @param options - the leaf options (subject, SANs, EKUs, validity)
     * @param algorithm - the algorithm the issuer was created with, Ed25519 by default
     */
    public static async issueLeaf(
        issuer: PkiCaNode,
        options: PkiLeafCertOptions,
        algorithm: PkiKeyAlgorithm = PkiKeyAlgorithm.ed25519
    ): Promise<PkiIssuedLeaf> {
        const leafKeys = await PkiCertificateBuilder.generateKeyPair(algorithm);

        const signer: PkiIssuer = {
            certificate: issuer.certificate,
            privateKey: await PkiCertificateBuilder.importPrivateKey(issuer.privateKey, algorithm)
        };

        const certificate = await PkiCertificateBuilder.createLeafCertificate(
            options,
            leafKeys.publicKey,
            signer,
            algorithm
        );

        return {
            certificate: certificate,
            keyPair: await PkiCertificateBuilder.exportKeyPair(leafKeys)
        };
    }

    /**
     * Roll (renew) a purpose Intermediate CA: mint a fresh Intermediate with a
     * NEW key, signed by the existing Root, keeping the purpose's common name and
     * name constraints. Used for scheduled rotation (design: Intermediate 1-3y)
     * or after a suspected key compromise. The old Intermediate stays valid until
     * its leaves expire (overlap); new leaves are issued from the returned node.
     * Trust is unchanged — both Intermediates chain to the same Root (own-PKI
     * epic 9.4.3-E).
     * @param root - the existing Root CA node (certificate + PEM private key)
     * @param purpose - the purpose whose Intermediate to roll
     * @param options - organization / validity / algorithm overrides
     */
    public static async rollIntermediate(
        root: PkiCaNode,
        purpose: PkiCaPurpose,
        options: PkiCaTreeOptions = {}
    ): Promise<PkiCaNode> {
        const algorithm = options.algorithm ?? PkiKeyAlgorithm.ed25519;
        const validityDays = options.intermediateValidityDays ?? DEFAULT_INTERMEDIATE_VALIDITY_DAYS;
        // Derive the organization from the Root's subject so the rolled Intermediate
        // keeps the exact same subject as the one it replaces (the Root carries the
        // O=), unless the caller overrides it.
        const organization = options.organization ?? PkiCaTree._organizationOf(root.certificate);

        const rootIssuer: PkiIssuer = {
            certificate: root.certificate,
            privateKey: await PkiCertificateBuilder.importPrivateKey(root.privateKey, algorithm)
        };

        return PkiCaTree._createIntermediate(purpose, organization, validityDays, rootIssuer, algorithm);
    }

    /**
     * Roll (renew) the Root CA key: mint a new self-signed Root with a NEW key
     * but the same subject, and cross-sign it with the old Root's key so verifiers
     * that still trust the old Root can build a path to the new one during the
     * transition (own-PKI epic 9.4.3-E). Intermediates are then re-issued under
     * the new Root (via rollIntermediate). The old Root stays a valid trust anchor
     * until it is retired from the trust stores.
     * @param oldRoot - the current Root CA node (certificate + PEM private key)
     * @param options - organization / validity / algorithm overrides
     */
    public static async rollRoot(
        oldRoot: PkiCaNode,
        options: PkiCaTreeOptions = {}
    ): Promise<PkiRootRolloverResult> {
        const algorithm = options.algorithm ?? PkiKeyAlgorithm.ed25519;
        const organization = options.organization ?? PkiCaTree._organizationOf(oldRoot.certificate);
        const validityDays = options.rootValidityDays ?? DEFAULT_ROOT_VALIDITY_DAYS;

        const rootKeys = await PkiCertificateBuilder.generateKeyPair(algorithm);
        const rootCert = await PkiCertificateBuilder.createRootCa({
            subject: `CN=FlyingFish Root CA, O=${organization}`,
            validityDays: validityDays,
            pathLength: 1
        }, rootKeys, algorithm);

        const rootPem = await PkiCertificateBuilder.exportKeyPair(rootKeys);

        const newRoot: PkiCaNode = {
            certificate: rootCert,
            privateKey: rootPem.privateKey,
            publicKey: rootPem.publicKey
        };

        const oldRootIssuer: PkiIssuer = {
            certificate: oldRoot.certificate,
            privateKey: await PkiCertificateBuilder.importPrivateKey(oldRoot.privateKey, algorithm)
        };

        const crossCertificate = await PkiCertificateBuilder.createCrossSigned(
            newRoot.certificate,
            oldRootIssuer,
            algorithm
        );

        return {
            root: newRoot,
            crossCertificate: crossCertificate
        };
    }

    /**
     * The organization (O=) from a certificate's subject, or the default.
     * @param certificate - the certificate PEM
     */
    private static _organizationOf(certificate: string): string {
        const organizations = X509Name.getField(X509Reader.subjectAttributes(Pem.decode(certificate)), '2.5.4.10');

        return organizations.length > 0 ? organizations[0] : DEFAULT_ORGANIZATION;
    }

    /**
     * Create a single purpose Intermediate CA signed by the root.
     * @param purpose - the CA purpose
     * @param organization - the O= for the distinguished name
     * @param validityDays - the intermediate validity in days
     * @param rootIssuer - the signing root CA
     * @param algorithm - the signature algorithm
     */
    private static async _createIntermediate(
        purpose: PkiCaPurpose,
        organization: string,
        validityDays: number,
        rootIssuer: PkiIssuer,
        algorithm: PkiKeyAlgorithm
    ): Promise<PkiCaNode> {
        const config = PURPOSE_CONFIG[purpose];
        const keys = await PkiCertificateBuilder.generateKeyPair(algorithm);

        const caOptions: PkiCaCertOptions = {
            subject: `CN=${config.commonName}, O=${organization}`,
            validityDays: validityDays,
            // Intermediates issue only leaves, no further CA below them.
            pathLength: 0,
            nameConstraints: {
                permittedUri: [config.uriNamespace]
            }
        };

        const certificate = await PkiCertificateBuilder.createIntermediateCa(
            caOptions,
            keys.publicKey,
            rootIssuer,
            algorithm
        );

        const pem = await PkiCertificateBuilder.exportKeyPair(keys);

        return {
            certificate: certificate,
            privateKey: pem.privateKey,
            publicKey: pem.publicKey
        };
    }

}