/**
 * The registry secret header the Hub authenticates service parts with.
 */
const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';

/**
 * A minimal fetch signature (injectable for tests).
 */
export type WanFetch = (url: string, init?: {headers?: Record<string, string>;}) => Promise<{json(): Promise<unknown>;}>;

/**
 * Pulls the WAN interface name from the Hub for the ff-wan part (Pi-router epic, Phase
 * 3). Reuses the backend's resolved netfilter config (`/json/router/netfilter-config`,
 * whose `wanInterface` is the enabled `wan`-role interface). Returns '' on any error /
 * no WAN configured, so the reconcile loop just waits and retries.
 */
export class WanConfigClient {

    private readonly _hubUrl: string;

    private readonly _secret: string;

    private readonly _fetch: WanFetch;

    /**
     * @param hubUrl - the Hub (backend) base url
     * @param secret - the registry shared secret
     * @param fetchImpl - optional fetch implementation (defaults to the global fetch)
     */
    public constructor(hubUrl: string, secret: string, fetchImpl?: WanFetch) {
        this._hubUrl = hubUrl.replace(/\/+$/u, '');
        this._secret = secret;
        this._fetch = fetchImpl ?? (fetch as unknown as WanFetch);
    }

    /**
     * The configured WAN interface name, or '' if none / on error.
     */
    public async fetchWanInterface(): Promise<string> {
        try {
            const response = await this._fetch(`${this._hubUrl}/json/router/netfilter-config`, {
                headers: {[HEADER_REGISTRY_SECRET]: this._secret}
            });

            const data = await response.json() as {config?: {wanInterface?: unknown;};};
            const wan = data.config?.wanInterface;

            return typeof wan === 'string' ? wan : '';
        } catch {
            return '';
        }
    }

}