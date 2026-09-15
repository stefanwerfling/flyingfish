import {ClusterPeerInfo, ClusterPeerRoster} from './ClusterMembership.js';

/**
 * The subset of the WHATWG fetch used here — injectable so the roster is testable
 * without a running Hub.
 */
export type ClusterFetch = (url: string, init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}) => Promise<{json(): Promise<unknown>;}>;

/**
 * Options for {@link HubClusterPeerRoster}.
 */
export type HubClusterPeerRosterOptions = {
    hubUrl: string;
    selfNodeUid: string;
    secret?: string;
    fetchImpl?: ClusterFetch;
};

const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';

/**
 * The Hub-backed cluster peer roster (Cluster/Mesh epic 9.5.1): announces this
 * node's peer-transport endpoint to the Hub and reads back the roster of the
 * OTHER cluster nodes (self is filtered out). This is the production
 * {@link ClusterPeerRoster} a {@link ClusterMembership} syncs against; discovery
 * is Hub-bootstrapped for now (a gossip layer can replace it later). Authenticated
 * with the shared registry secret over the same channel as the part registration.
 */
export class HubClusterPeerRoster implements ClusterPeerRoster {

    private readonly _hubUrl: string;

    private readonly _selfNodeUid: string;

    private readonly _secret: string;

    private readonly _fetch: ClusterFetch;

    /**
     * @param options - the Hub URL, this node's nodeUid, the registry secret and an
     *                  optional fetch implementation
     */
    public constructor(options: HubClusterPeerRosterOptions) {
        this._hubUrl = options.hubUrl.replace(/\/+$/u, '');
        this._selfNodeUid = options.selfNodeUid;
        this._secret = options.secret ?? '';
        this._fetch = options.fetchImpl ?? (fetch as unknown as ClusterFetch);
    }

    /**
     * Announce this node's peer-transport endpoint to the Hub.
     * @param host - the peer transport host other nodes reach this node at
     * @param port - the peer transport port
     */
    public async announce(host: string, port: number): Promise<void> {
        await this._fetch(`${this._hubUrl}/json/registry/cluster/announce`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                [HEADER_REGISTRY_SECRET]: this._secret
            },
            body: JSON.stringify({nodeUid: this._selfNodeUid, host: host, port: port})
        });
    }

    /**
     * The other cluster nodes' peer endpoints (self excluded).
     */
    public async list(): Promise<ClusterPeerInfo[]> {
        const response = await this._fetch(`${this._hubUrl}/json/registry/cluster/peers`, {
            headers: {[HEADER_REGISTRY_SECRET]: this._secret}
        });

        const data = await response.json() as {list?: ClusterPeerInfo[];};

        return (data.list ?? []).filter((peer) => peer.nodeUid !== this._selfNodeUid);
    }

}