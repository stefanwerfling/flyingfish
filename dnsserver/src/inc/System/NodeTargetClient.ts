import {SchemaSystemEffectiveConfigResponse} from 'flyingfish_schemas';

/**
 * The registry secret header the Hub authenticates service parts with.
 */
const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';

/**
 * A minimal fetch signature (injectable for tests).
 */
export type NodeTargetFetch = (
    url: string,
    init?: {headers?: Record<string, string>;}
) => Promise<{json(): Promise<unknown>;}>;

/**
 * NodeTargetClient — pulls this node's resolved effective target IP from the backend
 * (`GET /json/system/effective-config`, registry-secret guarded) so the DNS server can
 * answer follow-node A/AAAA records with it (Attach/Router epic). Best-effort: returns ''
 * on any error, so a transient backend outage just keeps the last known value.
 */
export class NodeTargetClient {

    private readonly _hubUrl: string;

    private readonly _secret: string;

    private readonly _fetch: NodeTargetFetch;

    /**
     * @param hubUrl - the Hub (backend) base url
     * @param secret - the registry shared secret
     * @param fetchImpl - optional fetch implementation (defaults to the global fetch)
     */
    public constructor(hubUrl: string, secret: string, fetchImpl?: NodeTargetFetch) {
        this._hubUrl = hubUrl.replace(/\/+$/u, '');
        this._secret = secret;
        this._fetch = fetchImpl ?? (fetch as unknown as NodeTargetFetch);
    }

    /**
     * The node's resolved target IP, or '' when unavailable / on error.
     * @returns {Promise<string>}
     */
    public async fetchTargetIp(): Promise<string> {
        try {
            const response = await this._fetch(`${this._hubUrl}/json/system/effective-config`, {
                headers: {[HEADER_REGISTRY_SECRET]: this._secret}
            });

            const data = await response.json();

            if (!SchemaSystemEffectiveConfigResponse.validate(data, [])) {
                return '';
            }

            return data.target_ip;
        } catch {
            return '';
        }
    }

}
