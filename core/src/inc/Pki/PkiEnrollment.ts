import {webcrypto} from 'crypto';
import {PkiCertificateBuilder, PkiSanEntry} from '../Crypto/PkiCertificateBuilder.js';
import {PkiCaPurpose, PkiCaTreeResult} from './PkiCaTree.js';
import {PkiBootstrapTokenStore, PkiClock} from './PkiBootstrapTokenStore.js';

const DEFAULT_LEAF_VALIDITY_DAYS = 7;

/**
 * The lifecycle state of an enrollment request.
 */
export enum PkiEnrollmentStatus {
    pending = 'pending',
    issued = 'issued',
    rejected = 'rejected'
}

/**
 * The input a node submits to enroll: its CSR, the bootstrap token, and the
 * requested identity.
 */
export type PkiEnrollmentInput = {
    /**
     * The PKCS#10 CSR PEM (proves possession of the node's private key).
     */
    csr: string;

    /**
     * The bootstrap token authorizing the enrollment.
     */
    bootstrapToken: string;

    /**
     * The requested common name for the issued certificate's subject.
     */
    commonName: string;

    /**
     * Additional subject alternative names to add beyond the assigned identity
     * URI.
     */
    sans?: PkiSanEntry[];

    /**
     * Leaf validity in days. Defaults to 7 (design: Service 7d).
     */
    validityDays?: number;
};

/**
 * An issued certificate plus its chain and the stable node identity assigned to
 * it.
 */
export type PkiIssuedCertificate = {
    nodeUid: string;
    certificate: string;
    chain: string[];
};

/**
 * A tracked enrollment request (pending admin approval, issued, or rejected).
 */
export type PkiEnrollmentRequest = {
    id: string;
    status: PkiEnrollmentStatus;
    purpose: PkiCaPurpose;
    nodeUid: string;
    commonName: string;
    sans: PkiSanEntry[];
    validityDays: number;
    csr: string;
    issued?: PkiIssuedCertificate;
    createdAt: number;
};

/**
 * EST-style enrollment over a CA tree: nodes present a CSR + bootstrap token and
 * either get a certificate immediately (auto-approve) or wait for an admin to
 * approve the queued request. Assigns a stable nodeUid and puts it into the
 * certificate as a flyingfish://<purpose>/<nodeUid> SAN URI (PKI-Design §2/§3).
 *
 * In-memory request tracking here; the HTTP endpoints (VTS-validated) and DB
 * persistence come with the PKI part container (roadmap 9.4.6). Renewal is
 * 9.4.3, revocation 9.4.4.
 */
export class PkiEnrollmentService {

    private readonly _tree: PkiCaTreeResult;

    private readonly _tokens: PkiBootstrapTokenStore;

    private readonly _clock: PkiClock;

    private readonly _requests: Map<string, PkiEnrollmentRequest> = new Map();

    /**
     * @param tree - the CA tree to issue from
     * @param tokens - the bootstrap token store
     * @param clock - epoch-ms clock, defaults to Date.now (injectable for tests)
     */
    public constructor(
        tree: PkiCaTreeResult,
        tokens: PkiBootstrapTokenStore,
        clock: PkiClock = (): number => Date.now()
    ) {
        this._tree = tree;
        this._tokens = tokens;
        this._clock = clock;
    }

    /**
     * Enroll a node. Consumes the bootstrap token; on an auto-approve token the
     * certificate is issued immediately (status issued), otherwise the request
     * is queued (status pending). Throws on an invalid/expired token or a CSR
     * that fails proof of possession.
     * @param input - the enrollment input
     */
    public async enroll(input: PkiEnrollmentInput): Promise<PkiEnrollmentRequest> {
        const token = this._tokens.consume(input.bootstrapToken);

        if (token === null) {
            throw new Error('PkiEnrollmentService: invalid or expired bootstrap token');
        }

        if (!await PkiCertificateBuilder.verifyCsr(input.csr)) {
            throw new Error('PkiEnrollmentService: CSR proof-of-possession failed');
        }

        const request: PkiEnrollmentRequest = {
            id: webcrypto.randomUUID(),
            status: PkiEnrollmentStatus.pending,
            purpose: token.purpose,
            nodeUid: webcrypto.randomUUID(),
            commonName: input.commonName,
            sans: input.sans ?? [],
            validityDays: input.validityDays ?? DEFAULT_LEAF_VALIDITY_DAYS,
            csr: input.csr,
            createdAt: this._clock()
        };

        this._requests.set(request.id, request);

        if (token.autoApprove) {
            return this._issue(request);
        }

        return request;
    }

    /**
     * Approve a pending request and issue its certificate.
     * @param requestId - the request id
     */
    public async approve(requestId: string): Promise<PkiEnrollmentRequest> {
        const request = this._requests.get(requestId);

        if (!request) {
            throw new Error(`PkiEnrollmentService: unknown enrollment request ${requestId}`);
        }

        if (request.status !== PkiEnrollmentStatus.pending) {
            throw new Error(`PkiEnrollmentService: request ${requestId} is not pending (${request.status})`);
        }

        return this._issue(request);
    }

    /**
     * Reject a pending request.
     * @param requestId - the request id
     */
    public reject(requestId: string): PkiEnrollmentRequest {
        const request = this._requests.get(requestId);

        if (!request) {
            throw new Error(`PkiEnrollmentService: unknown enrollment request ${requestId}`);
        }

        request.status = PkiEnrollmentStatus.rejected;

        return request;
    }

    /**
     * Get a tracked enrollment request by id.
     * @param requestId - the request id
     */
    public getRequest(requestId: string): PkiEnrollmentRequest | null {
        return this._requests.get(requestId) ?? null;
    }

    /**
     * The CA chain for a purpose (EST cacerts): [intermediate, root].
     * @param purpose - the CA purpose
     */
    public getCaChain(purpose: PkiCaPurpose): string[] {
        return [
            this._tree.intermediates[purpose].certificate,
            this._tree.root.certificate
        ];
    }

    /**
     * Issue the certificate for a request from its purpose intermediate, mark it
     * issued and return the updated request.
     * @param request - the request to issue for
     */
    private async _issue(request: PkiEnrollmentRequest): Promise<PkiEnrollmentRequest> {
        const intermediate = this._tree.intermediates[request.purpose];

        const publicKey = await PkiCertificateBuilder.getCsrPublicKey(request.csr);

        const san: PkiSanEntry[] = [
            {type: 'url', value: `flyingfish://${request.purpose}/${request.nodeUid}`},
            ...request.sans
        ];

        const certificate = await PkiCertificateBuilder.createLeafCertificate({
            subject: `CN=${request.commonName}`,
            validityDays: request.validityDays,
            san: san
        }, publicKey, {
            certificate: intermediate.certificate,
            privateKey: await PkiCertificateBuilder.importPrivateKey(intermediate.privateKey, this._tree.algorithm)
        }, this._tree.algorithm);

        const chain = await PkiCertificateBuilder.buildChain(certificate, [
            this._tree.root.certificate,
            intermediate.certificate
        ]);

        request.issued = {
            nodeUid: request.nodeUid,
            certificate: certificate,
            chain: chain
        };
        request.status = PkiEnrollmentStatus.issued;

        return request;
    }

}