import {ClusterFetch} from './HubClusterPeerRoster.js';

/**
 * One key→value pair exchanged between a clusterserver and its local Hub (Cluster/
 * Mesh epic 9.5.12 phase 2b): the Hub's publishable resources on the way in, the
 * converged cluster aggregate on the way back.
 *
 * `global` marks an entry whose key is already cluster-unique and must NOT be
 * namespaced by the owning node's uid (Cluster/Mesh 9.5.12, A+C): per-node resources
 * (domains) are namespaced `<nodeUid>/<key>` so each node's copy is distinct, but a
 * genuinely SHARED resource keyed by a cluster-stable UUID (the RBAC policy tables)
 * is published under one global key so every node writes THE same gossip key and the
 * LWW store converges. Absent/false = per-node (namespaced).
 */
export type ClusterGossipStateEntry = {
    key: string;
    value: unknown;
    global?: boolean;
    // Marks this entry as a tombstone (a delete that must propagate) rather than a
    // live value, on both legs: the Hub announces a pending delete this way on the
    // way in, and the clusterserver reports a converged tombstone this way on the way
    // back so every node's converger can delete its own local copy too (Cluster/Mesh
    // epic 9.5.12.8 fix). Absent/false = a live value.
    deleted?: boolean;
};

/**
 * Options for {@link HubClusterGossipSync}.
 */
export type HubClusterGossipSyncOptions = {
    hubUrl: string;
    selfNodeUid: string;
    secret?: string;
    fetchImpl?: ClusterFetch;
};

const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';

/**
 * The clusterserver's sync client to its LOCAL Hub (Cluster/Mesh epic 9.5.12, G1
 * placement). The Hub is a passive registry server; the clusterserver (the mesh
 * gossip agent) is the active party — exactly the topology already used for the peer
 * roster and L4 routes. {@link HubClusterGossipSync.pullLocalState} reads the
 * resources the Hub wants published (which the clusterserver then owns + gossips) and
 * {@link HubClusterGossipSync.pushAggregate} hands the converged cluster-wide state
 * back so the Hub can serve it to the frontend. Same registry-secret auth + injectable
 * fetch as the other Hub clients.
 */
export class HubClusterGossipSync {

    private readonly _hubUrl: string;

    private readonly _selfNodeUid: string;

    private readonly _secret: string;

    private readonly _fetch: ClusterFetch;

    /**
     * @param options - the Hub URL, this node's nodeUid, the registry secret and an
     *                  optional fetch implementation
     */
    public constructor(options: HubClusterGossipSyncOptions) {
        this._hubUrl = options.hubUrl.replace(/\/+$/u, '');
        this._selfNodeUid = options.selfNodeUid;
        this._secret = options.secret ?? '';
        this._fetch = options.fetchImpl ?? (fetch as unknown as ClusterFetch);
    }

    /**
     * Read the Hub's publishable resources (Hub-relative keys). Malformed entries are
     * skipped so one bad entry can't break the sync.
     */
    public async pullLocalState(): Promise<ClusterGossipStateEntry[]> {
        const response = await this._fetch(`${this._hubUrl}/json/registry/cluster/local-state`, {
            headers: {[HEADER_REGISTRY_SECRET]: this._secret}
        });

        const data = await response.json() as {entries?: ClusterGossipStateEntry[];};
        const entries: ClusterGossipStateEntry[] = [];

        for (const entry of data.entries ?? []) {
            if (entry !== null && typeof entry === 'object' && typeof entry.key === 'string') {
                const parsed: ClusterGossipStateEntry = {key: entry.key, value: entry.value};

                // Carry the global flag only when set — absent means per-node (namespaced).
                if (entry.global === true) {
                    parsed.global = true;
                }

                // Carry the tombstone flag only when set — absent means a live value.
                if (entry.deleted === true) {
                    parsed.deleted = true;
                }

                entries.push(parsed);
            }
        }

        return entries;
    }

    /**
     * Push the converged cluster-wide state back to the Hub for the frontend to read.
     * @param entries - the aggregate live entries
     */
    public async pushAggregate(entries: readonly ClusterGossipStateEntry[]): Promise<void> {
        await this._fetch(`${this._hubUrl}/json/registry/cluster/aggregate`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                [HEADER_REGISTRY_SECRET]: this._secret
            },
            body: JSON.stringify({nodeUid: this._selfNodeUid, entries: entries})
        });
    }

}