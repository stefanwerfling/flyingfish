import {WanLeaseFields} from 'flyingfish_core';

/**
 * The registry secret header the Hub authenticates service parts with.
 */
const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';

/**
 * A minimal fetch signature (injectable for tests).
 */
export type WanFetch = (url: string, init?: {method?: string; headers?: Record<string, string>; body?: string;}) => Promise<unknown>;

/**
 * Reports the WAN DHCP lease ff-wan obtained back to the Hub (Pi-router epic, Phase 3):
 * POSTs the parsed lease to `/json/router/wan-lease`. Best-effort — a failed report is
 * swallowed (the next lease event / reconcile retries).
 */
export class WanLeaseReporter {

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
     * Report a lease. Returns true on a successful POST, false on any error.
     * @param lease - the parsed WAN lease
     */
    public async report(lease: WanLeaseFields): Promise<boolean> {
        try {
            await this._fetch(`${this._hubUrl}/json/router/wan-lease`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    [HEADER_REGISTRY_SECRET]: this._secret
                },
                body: JSON.stringify(lease)
            });

            return true;
        } catch {
            return false;
        }
    }

}