import {webcrypto} from 'crypto';
import {PkiCaPurpose} from './PkiCaTree.js';

/**
 * A clock returning epoch milliseconds. Injectable so token expiry is
 * deterministically testable.
 */
export type PkiClock = () => number;

const DEFAULT_TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * A bootstrap token a node presents to enroll. Either auto-approving (the CA
 * issues immediately - "Token-Auto-Enroll", for scale) or not (the request is
 * queued for an admin - "Admin-approved", the default for nodes). PKI-Design §3.
 */
export type PkiBootstrapToken = {
    token: string;
    purpose: PkiCaPurpose;
    autoApprove: boolean;
    singleUse: boolean;
    expiresAt: number;
};

/**
 * Options for issuing a bootstrap token.
 */
export type PkiBootstrapTokenOptions = {
    /**
     * Which purpose intermediate the enrolled certificate is issued from.
     */
    purpose: PkiCaPurpose;

    /**
     * true = issue the certificate immediately on enroll; false (default) = the
     * request is queued for admin approval.
     */
    autoApprove?: boolean;

    /**
     * Time-to-live in milliseconds. Default 15 minutes.
     */
    ttlMs?: number;

    /**
     * Whether the token is consumed on first use. Default true.
     */
    singleUse?: boolean;
};

/**
 * Issues and validates short-lived, out-of-band-distributed bootstrap tokens.
 * In-memory here; a persistent store (DB) backs it in the PKI part container
 * (roadmap 9.4.6).
 */
export class PkiBootstrapTokenStore {

    private readonly _tokens: Map<string, PkiBootstrapToken> = new Map();

    private readonly _clock: PkiClock;

    /**
     * @param clock - epoch-ms clock, defaults to Date.now (injectable for tests)
     */
    public constructor(clock: PkiClock = (): number => Date.now()) {
        this._clock = clock;
    }

    /**
     * Issue a new bootstrap token.
     * @param options - the token options
     */
    public issue(options: PkiBootstrapTokenOptions): PkiBootstrapToken {
        const bytes = webcrypto.getRandomValues(new Uint8Array(32));
        const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');

        const record: PkiBootstrapToken = {
            token: token,
            purpose: options.purpose,
            autoApprove: options.autoApprove ?? false,
            singleUse: options.singleUse ?? true,
            expiresAt: this._clock() + (options.ttlMs ?? DEFAULT_TOKEN_TTL_MS)
        };

        this._tokens.set(token, record);

        return record;
    }

    /**
     * Return the token record if it exists and has not expired, else null.
     * Does not consume the token.
     * @param token - the token string
     */
    public validate(token: string): PkiBootstrapToken | null {
        const record = this._tokens.get(token);

        if (!record) {
            return null;
        }

        if (record.expiresAt <= this._clock()) {
            this._tokens.delete(token);

            return null;
        }

        return record;
    }

    /**
     * Validate and, if single-use, consume the token.
     * @param token - the token string
     */
    public consume(token: string): PkiBootstrapToken | null {
        const record = this.validate(token);

        if (record === null) {
            return null;
        }

        if (record.singleUse) {
            this._tokens.delete(token);
        }

        return record;
    }

}