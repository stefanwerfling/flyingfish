import {HimHIPData} from 'flyingfish_schemas';

/**
 * The registry secret header the Hub authenticates service parts with.
 */
const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';

/**
 * A minimal fetch signature (injectable for tests).
 */
export type HostInfoFetch = (url: string, init?: {method?: string; headers?: Record<string, string>; body?: string;}) => Promise<unknown>;

/**
 * HostInfoReporter — reports this node's host/gateway facts (from {@link HostRouteProbe})
 * to the Hub over HTTP (`POST /json/router/host-info`), replacing the former HimHIP Redis
 * transport. Best-effort — a failed report is swallowed (the next reconcile retries).
 */
export class HostInfoReporter {

    private readonly _hubUrl: string;

    private readonly _secret: string;

    private readonly _fetch: HostInfoFetch;

    /**
     * @param hubUrl - the Hub (backend) base url
     * @param secret - the registry shared secret
     * @param fetchImpl - optional fetch implementation (defaults to the global fetch)
     */
    public constructor(hubUrl: string, secret: string, fetchImpl?: HostInfoFetch) {
        this._hubUrl = hubUrl.replace(/\/+$/u, '');
        this._secret = secret;
        this._fetch = fetchImpl ?? (fetch as unknown as HostInfoFetch);
    }

    /**
     * Report the host info. Returns true on a successful POST, false on any error.
     * @param data - the probed host/gateway facts
     */
    public async report(data: HimHIPData): Promise<boolean> {
        try {
            await this._fetch(`${this._hubUrl}/json/router/host-info`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    [HEADER_REGISTRY_SECRET]: this._secret
                },
                body: JSON.stringify(data)
            });

            return true;
        } catch {
            return false;
        }
    }

}
