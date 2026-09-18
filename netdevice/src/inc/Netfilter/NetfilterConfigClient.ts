import {NftablesRouterConfig} from 'flyingfish_core';

/**
 * The registry secret header the Hub authenticates service parts with (matches the
 * clusterserver clients).
 */
const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';

/**
 * A minimal fetch signature (injectable for tests / to avoid a hard global dep).
 */
export type NetfilterFetch = (url: string, init?: {headers?: Record<string, string>;}) => Promise<{json(): Promise<unknown>;}>;

/**
 * Pulls the resolved netfilter config from the Hub (backend) for the netfilter part
 * (Pi-router epic, Phase 2b): GETs `/json/router/netfilter-config` with the registry
 * secret and returns the {@link NftablesRouterConfig}, or null on any error / malformed
 * response (so a transient Hub outage can't crash the reconcile loop).
 */
export class NetfilterConfigClient {

    private readonly _hubUrl: string;

    private readonly _secret: string;

    private readonly _fetch: NetfilterFetch;

    /**
     * @param hubUrl - the Hub (backend) base url (the registry url)
     * @param secret - the registry shared secret
     * @param fetchImpl - optional fetch implementation (defaults to the global fetch)
     */
    public constructor(hubUrl: string, secret: string, fetchImpl?: NetfilterFetch) {
        this._hubUrl = hubUrl.replace(/\/+$/u, '');
        this._secret = secret;
        this._fetch = fetchImpl ?? (fetch as unknown as NetfilterFetch);
    }

    /**
     * Fetch the resolved router config, or null on error / malformed response.
     */
    public async fetchConfig(): Promise<NftablesRouterConfig | null> {
        try {
            const response = await this._fetch(`${this._hubUrl}/json/router/netfilter-config`, {
                headers: {[HEADER_REGISTRY_SECRET]: this._secret}
            });

            const data = await response.json() as {config?: unknown;};

            return NetfilterConfigClient._parse(data.config);
        } catch {
            return null;
        }
    }

    /**
     * Defensively parse the config payload into an {@link NftablesRouterConfig}, or null
     * if it is not the expected shape.
     * @param value - the raw `config` field of the response
     */
    private static _parse(value: unknown): NftablesRouterConfig | null {
        if (value === null || typeof value !== 'object') {
            return null;
        }

        const config = value as Record<string, unknown>;

        if (typeof config.wanInterface !== 'string' || !Array.isArray(config.lans) ||
            typeof config.forward !== 'boolean') {
            return null;
        }

        const lans = config.lans
            .filter((entry): entry is Record<string, unknown> => entry !== null && typeof entry === 'object')
            .map((entry) => ({
                name: typeof entry.name === 'string' ? entry.name : '',
                nat44: entry.nat44 === true,
                ipv6Mode: (entry.ipv6Mode === 'nat66' || entry.ipv6Mode === 'pd' ? entry.ipv6Mode : 'off') as 'off' | 'nat66' | 'pd'
            }))
            .filter((lan) => lan.name !== '');

        return {
            wanInterface: config.wanInterface,
            lans: lans,
            forward: config.forward
        };
    }

}