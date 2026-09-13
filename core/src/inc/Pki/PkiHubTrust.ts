import {PkiCaCertsResponse, PkiRevocationListResponse} from 'flyingfish_schemas';
import {PkiCaPurpose} from './PkiCaTree.js';
import {PkiClientCertVerifier, PkiVerifiedIdentity} from './PkiClientCertVerifier.js';
import {PkiRevocationEntry, PkiRevocationList} from './PkiRevocationList.js';

/**
 * The Hub's trust state for authenticating parts by their client certificate
 * (own-PKI epic 9.4 mTLS transport; also the 9.4.4-D real-time enforcement). It
 * holds the CA chain and the revocation allowlist fetched from the pkiserver and
 * turns a presented peer certificate into a verified node identity — or rejects
 * it (bad chain / expired / revoked / no identity).
 *
 * The fetch (refresh) is I/O; the trust decision (authenticate) is pure and
 * exercised via load() in tests without a network.
 */
export class PkiHubTrust {

    private readonly _pkiUrl: string;

    private readonly _purpose: PkiCaPurpose;

    private readonly _revocation: PkiRevocationList = new PkiRevocationList();

    private _caChain: string[] = [];

    /**
     * @param pkiUrl - the pkiserver base URL
     * @param purpose - the CA purpose parts enroll under (default service)
     */
    public constructor(pkiUrl: string, purpose: PkiCaPurpose = PkiCaPurpose.service) {
        this._pkiUrl = pkiUrl.replace(/\/+$/u, '');
        this._purpose = purpose;
    }

    /**
     * Set the trust state directly (used by refresh(); public so it is testable
     * without a network).
     * @param caChain - the trusted CA chain ([intermediate, root])
     * @param revoked - the revoked node identities
     */
    public load(caChain: string[], revoked: PkiRevocationEntry[]): void {
        this._caChain = caChain;
        this._revocation.load(revoked);
    }

    /**
     * Fetch the CA chain and the revocation list from the pkiserver and update
     * the trust state. Call once at boot and then periodically (rollover +
     * revocation updates).
     */
    public async refresh(): Promise<void> {
        const [caChain, revoked] = await Promise.all([this._fetchCaChain(), this._fetchRevoked()]);

        this.load(caChain, revoked);
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
     * Fetch the CA chain for the configured purpose from the pkiserver.
     */
    private async _fetchCaChain(): Promise<string[]> {
        const response = await fetch(`${this._pkiUrl}/pki/cacerts?purpose=${this._purpose}`);
        const data = await response.json() as PkiCaCertsResponse;

        return data.chain ?? [];
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