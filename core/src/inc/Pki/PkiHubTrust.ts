import {PkiRevocationListResponse} from 'flyingfish_schemas';
import {PkiClientCertVerifier, PkiVerifiedIdentity} from './PkiClientCertVerifier.js';
import {PkiRevocationEntry, PkiRevocationList} from './PkiRevocationList.js';

/**
 * The Hub's trust state for authenticating parts by their client certificate
 * (own-PKI epic 9.4 mTLS transport; also the 9.4.4-D real-time enforcement). It
 * holds the CA chain and the revocation allowlist and turns a presented peer
 * certificate into a verified node identity — or rejects it (bad chain / expired
 * / revoked / no identity).
 *
 * The CA chain is set by the consumer (the backend reads it from a shared volume
 * the pkiserver writes — avoids a backend->pkiserver boot dependency cycle);
 * revocation is refreshed at runtime over HTTP. The trust decision (authenticate)
 * is pure and exercised via load()/setCaChain() in tests without a network.
 */
export class PkiHubTrust {

    private readonly _pkiUrl: string;

    private readonly _revocation: PkiRevocationList = new PkiRevocationList();

    private _caChain: string[] = [];

    /**
     * @param pkiUrl - the pkiserver base URL (used to refresh the revocation list)
     */
    public constructor(pkiUrl: string = '') {
        this._pkiUrl = pkiUrl.replace(/\/+$/u, '');
    }

    /**
     * Set the trust state directly (public so it is testable without I/O).
     * @param caChain - the trusted CA certificates (root + intermediates)
     * @param revoked - the revoked node identities
     */
    public load(caChain: string[], revoked: PkiRevocationEntry[]): void {
        this._caChain = caChain;
        this._revocation.load(revoked);
    }

    /**
     * Set the trusted CA chain (the backend loads it from the shared CA file the
     * pkiserver writes).
     * @param caChain - the trusted CA certificates (root + intermediates)
     */
    public setCaChain(caChain: string[]): void {
        this._caChain = caChain;
    }

    /**
     * Refresh the revocation list from the pkiserver (runtime, periodic — the
     * CA chain comes from the shared file, not from here). Best-effort.
     */
    public async refreshRevocation(): Promise<void> {
        this._revocation.load(await this._fetchRevoked());
    }

    /**
     * The currently trusted CA chain (e.g. to seed the TLS server's client CA).
     */
    public getCaChain(): string[] {
        return this._caChain;
    }

    /**
     * Authenticate a presented client certificate, returning its node identity or
     * null (not chained / expired / revoked / no FlyingFish identity, or no CA
     * chain loaded yet).
     * @param peerCertPem - the peer's leaf certificate PEM
     */
    public async authenticate(peerCertPem: string): Promise<PkiVerifiedIdentity | null> {
        if (this._caChain.length === 0) {
            return null;
        }

        return PkiClientCertVerifier.verify(peerCertPem, this._caChain, {revocationList: this._revocation});
    }

    /**
     * Fetch the revoked node identities from the pkiserver.
     */
    private async _fetchRevoked(): Promise<PkiRevocationEntry[]> {
        const response = await fetch(`${this._pkiUrl}/pki/revoked`);
        const data = await response.json() as PkiRevocationListResponse;

        return (data.list ?? []).map((entry) => {
            return {nodeUid: entry.nodeUid, revokedAt: entry.revokedAt};
        });
    }

}