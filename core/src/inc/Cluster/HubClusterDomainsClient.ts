import {ClusterFetch} from './HubClusterPeerRoster.js';

/**
 * A domain's currently-active node IP as the Hub sees it (Cluster/Mesh epic 9.5.14):
 * `activeIp` is the IP the domain's DNS A record should answer with right now (the
 * live, highest-priority node), or null if no node is live.
 */
export type ClusterDomainActive = {
    name: string;
    activeIp: string | null;
};

/**
 * Options for {@link HubClusterDomainsClient}.
 */
export type HubClusterDomainsClientOptions = {
    hubUrl: string;
    secret?: string;
    fetchImpl?: ClusterFetch;
};

const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';

/**
 * Reads the cluster-wide domain failover view from the Hub (Cluster/Mesh epic 9.5.14).
 * The dnsserver pulls this periodically so it can answer a cluster-managed domain's A
 * record with the active node's IP instead of its own local record — the DNS-side
 * actuation of the failover. Same registry-secret auth + injectable fetch as the other
 * Hub clients; malformed entries are skipped.
 */
export class HubClusterDomainsClient {

    private readonly _hubUrl: string;

    private readonly _secret: string;

    private readonly _fetch: ClusterFetch;

    /**
     * @param options - the Hub URL, the registry secret and an optional fetch impl
     */
    public constructor(options: HubClusterDomainsClientOptions) {
        this._hubUrl = options.hubUrl.replace(/\/+$/u, '');
        this._secret = options.secret ?? '';
        this._fetch = options.fetchImpl ?? (fetch as unknown as ClusterFetch);
    }

    /**
     * The cluster-wide domains with their currently-active IP.
     */
    public async list(): Promise<ClusterDomainActive[]> {
        const response = await this._fetch(`${this._hubUrl}/json/registry/cluster/domains`, {
            headers: {[HEADER_REGISTRY_SECRET]: this._secret}
        });

        const data = await response.json() as {list?: {name?: unknown; activeIp?: unknown;}[];};
        const domains: ClusterDomainActive[] = [];

        for (const entry of data.list ?? []) {
            if (entry !== null && typeof entry === 'object' && typeof entry.name === 'string') {
                domains.push({name: entry.name, activeIp: typeof entry.activeIp === 'string' ? entry.activeIp : null});
            }
        }

        return domains;
    }

}