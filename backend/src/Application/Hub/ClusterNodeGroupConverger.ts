import {
    ClusterNodeGroupMemberServiceDB,
    ClusterNodeGroupServiceDB,
    ClusterNodeGroupShareServiceDB,
    ClusterNodeGroupView
} from 'flyingfish_core';

/**
 * Converges the cluster-global NODE GROUPS + sharing rules (gossiped, aggregated by
 * {@link aggregateClusterNodeGroups}) into this node's LOCAL cluster_node_group* tables
 * (Cluster/Mesh epic 9.5.12.3/.4). Because groups + memberships + shares are keyed by
 * cluster-stable UUIDs, every node UPSERTs the shared rows into its own DB by id, so the
 * local DB becomes a replica of the shared grouping/sharing and any node can render /
 * enforce it — robust offline / after a restart, and correct for a single node with no
 * mesh (the aggregate then just carries the node's own rows). Mirrors {@link ClusterRbacConverger}.
 *
 * UPSERT-ONLY (create + update). DELETE propagation is deliberately out of scope here: the
 * pushed aggregate carries only live entries (no tombstones), so an absent row is
 * indistinguishable from a not-yet-propagated local write — deleting on that basis would be
 * unsafe. Delete convergence (via tombstone propagation) is a follow-up.
 */
export class ClusterNodeGroupConverger {

    /**
     * Upsert the shared node-group view into the local tables (idempotent, keyed by the
     * cluster-stable UUID id). Empty tables are skipped.
     * @param view - the cluster-wide node-group view aggregated from the gossip
     */
    public async import(view: ClusterNodeGroupView): Promise<void> {
        if (view.groups.length > 0) {
            await ClusterNodeGroupServiceDB.getInstance().getRepository().upsert(
                view.groups.map((group) => ({id: group.id, name: group.name, description: group.description, color: group.color})),
                ['id']
            );
        }

        if (view.members.length > 0) {
            await ClusterNodeGroupMemberServiceDB.getInstance().getRepository().upsert(
                view.members.map((member) => ({id: member.id, node_uid: member.nodeUid, group_uuid: member.groupUuid})),
                ['id']
            );
        }

        if (view.shares.length > 0) {
            await ClusterNodeGroupShareServiceDB.getInstance().getRepository().upsert(
                view.shares.map((share) => ({
                    id: share.id,
                    node_uid: share.nodeUid,
                    group_uuid: share.groupUuid,
                    resource_type: share.resourceType,
                    level: share.level
                })),
                ['id']
            );
        }
    }

}