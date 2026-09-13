import {Logger} from 'figtree';
import {PkiHubTrust} from 'flyingfish_core';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Process-wide holder for the Hub's PKI trust state (own-PKI epic 9.4 mTLS). The
 * backend fetches the CA chain + revocation list from the pkiserver at boot (so
 * the HTTPS server can be seeded with the client CA) and refreshes periodically
 * for CA rollover + revocation updates. The registry auth guard reads it to
 * authenticate parts by their client certificate. Optional — without pki config
 * the holder stays empty and the backend keeps using the shared secret only.
 */
export class PkiTrust {

    private static _instance: PkiHubTrust | null = null;

    private static _timer: ReturnType<typeof setInterval> | null = null;

    /**
     * Initialise the trust from the pkiserver URL: fetch the CA chain +
     * revocation list once (non-fatal) and start periodic refresh.
     * @param pkiUrl - the pkiserver base URL
     */
    public static async init(pkiUrl: string): Promise<void> {
        const trust = new PkiHubTrust(pkiUrl);

        try {
            await trust.refresh();
        } catch (error) {
            Logger.getLogger().warn('PkiTrust: initial refresh failed (mTLS auth stays off until reachable)', error);
        }

        PkiTrust._instance = trust;

        if (PkiTrust._timer === null) {
            PkiTrust._timer = setInterval((): void => {
                trust.refresh().catch((error: unknown): void => {
                    Logger.getLogger().warn('PkiTrust: periodic refresh failed', error);
                });
            }, REFRESH_INTERVAL_MS);

            PkiTrust._timer.unref();
        }
    }

    /**
     * The current trust instance, or null if PKI is not configured.
     */
    public static get(): PkiHubTrust | null {
        return PkiTrust._instance;
    }

}