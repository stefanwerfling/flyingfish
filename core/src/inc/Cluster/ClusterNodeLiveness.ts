import {ClusterGossipStateEntry} from './HubClusterGossipSync.js';

/**
 * The Hub-relative key prefix of a node's self descriptor in the gossip.
 */
export const CLUSTER_NODE_KEY_PREFIX = 'node:';

/**
 * A node whose heartbeat is older than this (ms) is considered down (~3 missed sync
 * heartbeats at the default 30s interval), so a domain fails over off it.
 */
export const CLUSTER_NODE_STALE_MS = 90000;

/**
 * The heartbeat-carrying value of a node descriptor.
 */
type NodeDescriptorValue = {
    nodeUid?: unknown;
    heartbeat?: unknown;
};

/**
 * Compute the set of currently-live node uids from the cluster gossip aggregate
 * (Cluster/Mesh epic 9.5.14, HA): each node refreshes a heartbeat timestamp in its
 * `node:<uid>` descriptor every sync, so a node is live if its last heartbeat is
 * within `staleMs` of now. This is the leaderless liveness signal fed to
 * {@link resolveDomainActiveNode} to pick the active node for a domain's DNS record.
 * @param entries - the cluster-wide aggregate entries
 * @param now - the current time (epoch ms)
 * @param staleMs - how long a heartbeat stays valid (default {@link CLUSTER_NODE_STALE_MS})
 */
export const clusterLiveNodeUids = (
    entries: readonly ClusterGossipStateEntry[],
    now: number,
    staleMs: number = CLUSTER_NODE_STALE_MS
): Set<string> => {
    const live = new Set<string>();

    for (const entry of entries) {
        if (!entry.key.startsWith(CLUSTER_NODE_KEY_PREFIX)) {
            continue;
        }

        const value = entry.value as NodeDescriptorValue;

        if (value === null || typeof value !== 'object' ||
            typeof value.nodeUid !== 'string' || typeof value.heartbeat !== 'number') {
            continue;
        }

        if (now - value.heartbeat <= staleMs) {
            live.add(value.nodeUid);
        }
    }

    return live;
};