import {ClusterGossipStateEntry} from './HubClusterGossipSync.js';
import {CLUSTER_NODE_KEY_PREFIX, CLUSTER_NODE_STALE_MS} from './ClusterNodeLiveness.js';

/**
 * One node seen across the cluster (Cluster/Mesh epic 9.5.12, Proxmox-style
 * management): its self-descriptor from the gossip node roster plus a derived
 * online flag. Every node seeds and heartbeats a `node:<uid>` descriptor into the
 * gossip, so the whole federated roster — and each node's liveness — emerges from
 * the converged aggregate without a central directory.
 */
export type ClusterNodeView = {
    nodeUid: string;
    host: string;
    port: number;
    // Epoch ms of this node's last heartbeat (from its gossip descriptor).
    lastHeartbeat: number;
    // True if the last heartbeat is within the stale window of `now` — the same
    // liveness signal {@link clusterLiveNodeUids} feeds DNS failover (9.5.14).
    online: boolean;
};

/**
 * The published value shape of a node descriptor (all fields defensive-read).
 */
type NodeEntryValue = {
    nodeUid?: unknown;
    host?: unknown;
    port?: unknown;
    heartbeat?: unknown;
};

/**
 * Build the cluster-wide node roster from the gossip aggregate (Cluster/Mesh epic
 * 9.5.12): collect every `node:<uid>` self-descriptor and derive whether each node
 * is currently online (its last heartbeat is within `staleMs` of `now`). This is
 * the read model behind the Proxmox-style node dashboard — leaderless, purely a
 * projection of the converged gossip. Node keys are NOT namespaced (a node seeds
 * its own descriptor directly), unlike domain keys; malformed values are ignored.
 * The result is ordered by nodeUid for a stable listing.
 * @param entries - the cluster-wide aggregate entries
 * @param now - the current time (epoch ms)
 * @param staleMs - how long a heartbeat stays valid (default {@link CLUSTER_NODE_STALE_MS})
 */
export const aggregateClusterNodes = (
    entries: readonly ClusterGossipStateEntry[],
    now: number,
    staleMs: number = CLUSTER_NODE_STALE_MS
): ClusterNodeView[] => {
    const byUid = new Map<string, ClusterNodeView>();

    for (const entry of entries) {
        if (!entry.key.startsWith(CLUSTER_NODE_KEY_PREFIX)) {
            continue;
        }

        const value = entry.value as NodeEntryValue;

        if (value === null || typeof value !== 'object' ||
            typeof value.nodeUid !== 'string' || typeof value.heartbeat !== 'number') {
            continue;
        }

        byUid.set(value.nodeUid, {
            nodeUid: value.nodeUid,
            host: typeof value.host === 'string' ? value.host : '',
            port: typeof value.port === 'number' && Number.isFinite(value.port) ? value.port : 0,
            lastHeartbeat: value.heartbeat,
            online: now - value.heartbeat <= staleMs
        });
    }

    return Array.from(byUid.values()).sort((a, b) => a.nodeUid.localeCompare(b.nodeUid));
};