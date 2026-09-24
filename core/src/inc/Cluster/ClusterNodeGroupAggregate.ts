import {ClusterGossipStateEntry} from './HubClusterGossipSync.js';

/**
 * The cluster-global NODE GROUPS, aggregated from the gossip (Cluster/Mesh epic
 * 9.5.12.3). A group and its memberships are each published under a GLOBAL, cluster-stable
 * UUID key (no per-node namespace), so this is one shared set — every node converges on
 * the same groups regardless of which node created them.
 */
export type ClusterNodeGroupEntry = {id: string; name: string; description: string; color: string;};
export type ClusterNodeGroupMemberEntry = {id: string; nodeUid: string; groupUuid: string;};

/**
 * One node's explicit rule sharing a resource type with a group, at `read` or `write`
 * (Cluster/Mesh epic 9.5.12.4) — the FREIGABE-GRENZE a resource type must cross before an
 * RBAC grant scoped to the group can apply.
 */
export type ClusterNodeGroupShareEntry = {id: string; nodeUid: string; groupUuid: string; resourceType: string; level: string;};

/**
 * The whole cluster-wide node-group view.
 */
export type ClusterNodeGroupView = {
    groups: ClusterNodeGroupEntry[];
    members: ClusterNodeGroupMemberEntry[];
    shares: ClusterNodeGroupShareEntry[];
};

/**
 * The gossip key prefixes. `node_group:` does not clash with `node_group_member:` or
 * `node_group_share:` — the longer, more specific prefixes are matched first so they win.
 */
const KEY_GROUP = 'node_group:';
const KEY_MEMBER = 'node_group_member:';
const KEY_SHARE = 'node_group_share:';

/**
 * Coerce an unknown to a string, defaulting to empty.
 * @param value - the value
 */
const toStr = (value: unknown): string => typeof value === 'string' ? value : '';

/**
 * Aggregate the gossip into the cluster-wide node-group view (Cluster/Mesh epic
 * 9.5.12.3): collect every global `node_group:<uuid>` / `node_group_member:<uuid>` entry.
 * Because the keys are cluster-global UUIDs (published un-namespaced), each logical row
 * appears once regardless of which node published it. Per-node entries and malformed
 * values are ignored. Each list is ordered by id for a stable listing.
 * @param entries - the cluster-wide aggregate entries
 */
export const aggregateClusterNodeGroups = (entries: readonly ClusterGossipStateEntry[]): ClusterNodeGroupView => {
    const view: ClusterNodeGroupView = {groups: [], members: [], shares: []};

    for (const entry of entries) {
        const value = entry.value;

        if (value === null || typeof value !== 'object') {
            continue;
        }

        const row = value as Record<string, unknown>;

        // Match the longer, more specific prefixes first — `node_group_member:` and
        // `node_group_share:` both start with `node_group:` too, so the group branch
        // would otherwise swallow them.
        if (entry.key.startsWith(KEY_MEMBER)) {
            view.members.push({id: toStr(row.id), nodeUid: toStr(row.nodeUid), groupUuid: toStr(row.groupUuid)});
        } else if (entry.key.startsWith(KEY_SHARE)) {
            view.shares.push({
                id: toStr(row.id),
                nodeUid: toStr(row.nodeUid),
                groupUuid: toStr(row.groupUuid),
                resourceType: toStr(row.resourceType),
                level: toStr(row.level)
            });
        } else if (entry.key.startsWith(KEY_GROUP)) {
            view.groups.push({id: toStr(row.id), name: toStr(row.name), description: toStr(row.description), color: toStr(row.color)});
        }
    }

    view.groups.sort((a, b) => a.id.localeCompare(b.id));
    view.members.sort((a, b) => a.id.localeCompare(b.id));
    view.shares.sort((a, b) => a.id.localeCompare(b.id));

    return view;
};