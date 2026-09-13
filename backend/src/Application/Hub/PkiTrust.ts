import * as fs from 'fs';
import {Logger} from 'figtree';
import {PkiHubTrust} from 'flyingfish_core';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Process-wide holder for the Hub's PKI trust state (own-PKI epic 9.4 mTLS). The
 * CA pool is read from a shared file the pkiserver writes (no boot-time HTTP
 * dependency on the pkiserver — avoids the backend<->pkiserver ordering cycle);
 * the revocation list is refreshed at runtime over the pkiserver URL. The
 * registry auth guard reads it to authenticate parts by their client certificate.
 * Optional — without pki config the holder stays empty and the backend keeps
 * using the shared secret only.
 *
 * Note: on the very first `compose up` the CA file may not exist yet (the
 * pkiserver starts after the backend); mTLS then activates on the next backend
 * start once the file has been written.
 */
export class PkiTrust {

    private static _instance: PkiHubTrust | null = null;

    private static _timer: ReturnType<typeof setInterval> | null = null;

    /**
     * Initialise the trust: seed the CA pool from the shared file (if present)
     * and, when a pkiserver URL is given, refresh the revocation list once
     * (non-fatal) and periodically.
     * @param caFile - path to the CA pool file the pkiserver exports (JSON PEM[])
     * @param pkiUrl - the pkiserver base URL for revocation refresh (optional)
     */
    public static async init(caFile?: string, pkiUrl?: string): Promise<void> {
        const trust = new PkiHubTrust(pkiUrl ?? '');

        // Publish the instance before the awaits: it is mutated in place below and
        // only read after _initServices completes (the HTTP server starts later).
        PkiTrust._instance = trust;

        if (caFile) {
            await PkiTrust._loadCaFile(trust, caFile);
        }

        if (pkiUrl) {
            try {
                await trust.refreshRevocation();
            } catch (error) {
                Logger.getLogger().warn('PkiTrust: initial revocation refresh failed', error);
            }

            if (PkiTrust._timer === null) {
                PkiTrust._timer = setInterval((): void => {
                    trust.refreshRevocation().catch((error: unknown): void => {
                        Logger.getLogger().warn('PkiTrust: periodic revocation refresh failed', error);
                    });
                }, REFRESH_INTERVAL_MS);

                PkiTrust._timer.unref();
            }
        }
    }

    /**
     * The current trust instance, or null if PKI is not configured.
     */
    public static get(): PkiHubTrust | null {
        return PkiTrust._instance;
    }

    /**
     * Read + parse the CA pool file and seed it into the trust. Non-fatal: if the
     * file is missing (first boot before the pkiserver wrote it) or unreadable,
     * the CA stays empty and mTLS is off until the next start.
     * @param trust - the trust to seed
     * @param caFile - the CA pool file path
     */
    private static async _loadCaFile(trust: PkiHubTrust, caFile: string): Promise<void> {
        try {
            const raw = await fs.promises.readFile(caFile, 'utf-8');
            const pool = JSON.parse(raw) as string[];

            trust.setCaChain(pool);

            Logger.getLogger().info(`PkiTrust: loaded CA pool (${pool.length} certs) from ${caFile}`);
        } catch (error) {
            Logger.getLogger().warn(
                `PkiTrust: CA pool file ${caFile} not readable yet (mTLS off until it exists)`,
                error
            );
        }
    }

}