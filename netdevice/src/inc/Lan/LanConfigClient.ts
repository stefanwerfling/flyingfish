/**
 * The registry secret header the Hub authenticates service parts with.
 */
const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';

/**
 * The resolved LAN DHCP config the part builds the dnsmasq config from (mirrors the
 * backend's SchemaRouterLanConfig; `leaseFile` is set by the part, not the Hub).
 */
export type LanConfig = {
    lanInterface: string;
    address: string;
    prefix: number;
    enable: boolean;
    rangeStart: string;
    rangeEnd: string;
    leaseSeconds: number;
    gateway: string;
    dnsServer: string;
    domain: string;
    raEnable: boolean;
};

/**
 * A minimal fetch signature (injectable for tests).
 */
export type LanFetch = (url: string, init?: {headers?: Record<string, string>;}) => Promise<{json(): Promise<unknown>;}>;

/**
 * Pulls the resolved LAN DHCP config from the Hub for the ff-lan part (Pi-router epic,
 * Phase 4): GETs `/json/router/lan-config`. Returns null on any error / malformed
 * response so the reconcile loop just retries.
 */
export class LanConfigClient {

    private readonly _hubUrl: string;

    private readonly _secret: string;

    private readonly _fetch: LanFetch;

    /**
     * @param hubUrl - the Hub (backend) base url
     * @param secret - the registry shared secret
     * @param fetchImpl - optional fetch implementation (defaults to the global fetch)
     */
    public constructor(hubUrl: string, secret: string, fetchImpl?: LanFetch) {
        this._hubUrl = hubUrl.replace(/\/+$/u, '');
        this._secret = secret;
        this._fetch = fetchImpl ?? (fetch as unknown as LanFetch);
    }

    /**
     * Fetch the resolved LAN config, or null on error / malformed response.
     */
    public async fetchConfigs(): Promise<LanConfig[]> {
        try {
            const response = await this._fetch(`${this._hubUrl}/json/router/lan-config`, {
                headers: {[HEADER_REGISTRY_SECRET]: this._secret}
            });

            const data = await response.json() as {configs?: unknown;};

            if (!Array.isArray(data.configs)) {
                return [];
            }

            return data.configs
                .map((entry) => LanConfigClient._parse(entry))
                .filter((cfg): cfg is LanConfig => cfg !== null);
        } catch {
            return [];
        }
    }

    /**
     * Defensively parse the config payload, or null if not the expected shape.
     * @param value - the raw `config` field
     */
    private static _parse(value: unknown): LanConfig | null {
        if (value === null || typeof value !== 'object') {
            return null;
        }

        const config = value as Record<string, unknown>;

        if (typeof config.lanInterface !== 'string' || typeof config.enable !== 'boolean') {
            return null;
        }

        return {
            lanInterface: config.lanInterface,
            address: typeof config.address === 'string' ? config.address : '',
            prefix: typeof config.prefix === 'number' ? config.prefix : 24,
            enable: config.enable,
            rangeStart: typeof config.rangeStart === 'string' ? config.rangeStart : '',
            rangeEnd: typeof config.rangeEnd === 'string' ? config.rangeEnd : '',
            leaseSeconds: typeof config.leaseSeconds === 'number' ? config.leaseSeconds : 3600,
            gateway: typeof config.gateway === 'string' ? config.gateway : '',
            dnsServer: typeof config.dnsServer === 'string' ? config.dnsServer : '',
            domain: typeof config.domain === 'string' ? config.domain : '',
            raEnable: config.raEnable === true
        };
    }

}