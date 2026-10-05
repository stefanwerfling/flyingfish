import {AvailableInterface} from 'flyingfish_schemas';

/**
 * The registry secret header the Hub authenticates service parts with.
 */
const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';

/**
 * A minimal fetch signature (injectable for tests).
 */
export type InterfaceFetch = (url: string, init?: {method?: string; headers?: Record<string, string>; body?: string;}) => Promise<unknown>;

/**
 * Reports the live host NIC list the netdevice part discovered back to the Hub
 * (interface discovery): POSTs to `/json/router/available-interfaces` so the management
 * UI can show a NIC select box. Best-effort — a failed report is swallowed (the next
 * reconcile retries).
 */
export class InterfaceReporter {

    private readonly _hubUrl: string;

    private readonly _secret: string;

    private readonly _fetch: InterfaceFetch;

    /**
     * @param {string} hubUrl - the Hub (backend) base url
     * @param {string} secret - the registry shared secret
     * @param {InterfaceFetch} [fetchImpl] - optional fetch implementation (defaults to global fetch)
     */
    public constructor(hubUrl: string, secret: string, fetchImpl?: InterfaceFetch) {
        this._hubUrl = hubUrl.replace(/\/+$/u, '');
        this._secret = secret;
        this._fetch = fetchImpl ?? (fetch as unknown as InterfaceFetch);
    }

    /**
     * Report the discovered interfaces. Returns true on a successful POST, false on error.
     * @param {AvailableInterface[]} interfaces - the discovered host NICs
     * @returns {Promise<boolean>}
     */
    public async report(interfaces: AvailableInterface[]): Promise<boolean> {
        try {
            await this._fetch(`${this._hubUrl}/json/router/available-interfaces`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    [HEADER_REGISTRY_SECRET]: this._secret
                },
                body: JSON.stringify({interfaces: interfaces})
            });

            return true;
        } catch {
            return false;
        }
    }

}
