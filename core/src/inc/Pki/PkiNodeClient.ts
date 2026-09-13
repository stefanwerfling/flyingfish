import * as x509 from '@peculiar/x509';
import {PkiCertificateBuilder, PkiKeyAlgorithm, PkiSanEntry} from '../Crypto/PkiCertificateBuilder.js';
import {PkiCaPurpose} from './PkiCaTree.js';
import {PkiRenewal} from './PkiRenewal.js';

/**
 * A node's own issued identity: its stable nodeUid, the CA purpose it enrolled
 * under, its private key PEM, the issued leaf and chain, and the validity window
 * (read from the certificate). The consuming part persists this (file store,
 * slice B) and reloads it on boot.
 */
export type PkiNodeIdentity = {
    nodeUid: string;
    purpose: PkiCaPurpose;
    commonName: string;
    privateKey: string;
    certificate: string;
    chain: string[];
    issuedAt: number;
    expiresAt: number;
};

/**
 * The enrollment request body a node sends (CSR + bootstrap token + identity).
 */
export type PkiNodeEnrollRequest = {
    csr: string;
    bootstrapToken: string;
    commonName: string;
    sans?: PkiSanEntry[];
    validityDays?: number;
};

/**
 * The re-enrollment request body a node sends (stable nodeUid + new CSR).
 */
export type PkiNodeRenewRequest = {
    nodeUid: string;
    purpose: PkiCaPurpose;
    csr: string;
    commonName: string;
    sans?: PkiSanEntry[];
    validityDays?: number;
};

/**
 * What enroll/renew return: the assigned identity plus the issued leaf + chain.
 */
export type PkiNodeEnrollResult = {
    nodeUid: string;
    certificate: string;
    chain: string[];
};

/**
 * Transport the client issues its requests over (the pkiserver EST endpoints).
 * Injected so the client stays testable without a network — a test can back it
 * with an in-process PkiEnrollmentService, production wires it to HTTP.
 */
export interface PkiNodeTransport {

    /**
     * POST /pki/enroll.
     * @param request - the enrollment body
     */
    enroll(request: PkiNodeEnrollRequest): Promise<PkiNodeEnrollResult>;

    /**
     * POST /pki/renew.
     * @param request - the re-enrollment body
     */
    renew(request: PkiNodeRenewRequest): Promise<PkiNodeEnrollResult>;

}

/**
 * Options a node passes to enroll for the first time.
 */
export type PkiNodeEnrollOptions = {
    bootstrapToken: string;
    purpose: PkiCaPurpose;
    commonName: string;
    sans?: PkiSanEntry[];
    validityDays?: number;
};

/**
 * Node-side PKI client (own-PKI epic 9.4, renewal driver 9.4.3-D / mTLS goal):
 * the piece a service part runs to obtain and keep its own certificate. It
 * generates a fresh key pair + CSR locally (the private key never leaves the
 * node), enrolls with a bootstrap token, and later re-enrolls (rotating the key
 * while keeping the stable nodeUid) once ~2/3 of the lifetime has elapsed.
 *
 * Pure crypto + the injected transport — no storage and no clock of its own, so
 * it is deterministic and network-free in tests. Persistence (the file store)
 * and the boot-time wiring into a part are the next slice (B).
 */
export class PkiNodeClient {

    private readonly _transport: PkiNodeTransport;

    private readonly _algorithm: PkiKeyAlgorithm;

    /**
     * @param transport - the enroll/renew transport (HTTP in production)
     * @param algorithm - the key algorithm for the node key pair (Ed25519 default)
     */
    public constructor(transport: PkiNodeTransport, algorithm: PkiKeyAlgorithm = PkiKeyAlgorithm.ed25519) {
        this._transport = transport;
        this._algorithm = algorithm;
    }

    /**
     * Enroll for the first time: generate a key pair + CSR, send the CSR with the
     * bootstrap token, and return the resulting identity (private key + issued
     * leaf + chain + validity read from the certificate).
     * @param options - the enrollment options
     */
    public async enroll(options: PkiNodeEnrollOptions): Promise<PkiNodeIdentity> {
        const keys = await PkiCertificateBuilder.generateKeyPair(this._algorithm);
        const csr = await PkiCertificateBuilder.createCsr(`CN=${options.commonName}`, keys);

        const result = await this._transport.enroll({
            csr: csr,
            bootstrapToken: options.bootstrapToken,
            commonName: options.commonName,
            sans: options.sans,
            validityDays: options.validityDays
        });

        const pem = await PkiCertificateBuilder.exportKeyPair(keys);

        return PkiNodeClient._toIdentity(result, options.purpose, options.commonName, pem.privateKey);
    }

    /**
     * Whether the identity should be renewed now (~2/3 of the lifetime elapsed).
     * @param identity - the current identity
     * @param now - the current time (epoch ms)
     */
    public static needsRenew(identity: PkiNodeIdentity, now: number): boolean {
        return PkiRenewal.isDue(identity.issuedAt, identity.expiresAt, now);
    }

    /**
     * Re-enroll: generate a NEW key pair + CSR (key rotation) and re-enroll under
     * the existing stable nodeUid, returning the refreshed identity.
     * @param identity - the current identity
     */
    public async renew(identity: PkiNodeIdentity): Promise<PkiNodeIdentity> {
        const keys = await PkiCertificateBuilder.generateKeyPair(this._algorithm);
        const csr = await PkiCertificateBuilder.createCsr(`CN=${identity.commonName}`, keys);

        const result = await this._transport.renew({
            nodeUid: identity.nodeUid,
            purpose: identity.purpose,
            csr: csr,
            commonName: identity.commonName
        });

        const pem = await PkiCertificateBuilder.exportKeyPair(keys);

        return PkiNodeClient._toIdentity(result, identity.purpose, identity.commonName, pem.privateKey);
    }

    /**
     * Assemble a PkiNodeIdentity, reading the validity window from the issued
     * certificate.
     * @param result - the enroll/renew result
     * @param purpose - the CA purpose
     * @param commonName - the common name
     * @param privateKey - the node private key PEM
     */
    private static _toIdentity(
        result: PkiNodeEnrollResult,
        purpose: PkiCaPurpose,
        commonName: string,
        privateKey: string
    ): PkiNodeIdentity {
        const cert = new x509.X509Certificate(result.certificate);

        return {
            nodeUid: result.nodeUid,
            purpose: purpose,
            commonName: commonName,
            privateKey: privateKey,
            certificate: result.certificate,
            chain: result.chain,
            issuedAt: cert.notBefore.getTime(),
            expiresAt: cert.notAfter.getTime()
        };
    }

}