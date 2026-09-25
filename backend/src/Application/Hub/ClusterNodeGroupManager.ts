import {
    ClusterNodeGroupDB,
    ClusterNodeGroupMemberDB,
    ClusterNodeGroupMemberServiceDB,
    ClusterNodeGroupServiceDB,
    ClusterNodeGroupShareDB,
    ClusterNodeGroupShareServiceDB
} from 'flyingfish_core';
import {ClusterTombstoneRecorder} from './ClusterTombstoneRecorder.js';

/**
 * The write side of the cluster node groups + sharing rules (Cluster/Mesh epic
 * 9.5.12.3/.4). CRUD on the LOCAL cluster_node_group* tables; the change is gossiped
 * cluster-wide on the next sync ({@link ClusterLocalStateProvider} publishes them global,
 * every node's {@link ClusterNodeGroupConverger} upserts them). A group/share is created
 * on whichever node the admin is on and converges everywhere — no central owner. Read
 * goes through the aggregated gossip view (aggregateClusterNodeGroups), not this class.
 */
export class ClusterNodeGroupManager {

    /**
     * Create (no id) or update (id set) a node group. Returns the group's id (the
     * generated UUID on create). A blank/absent id creates.
     * @param input - the group fields
     */
    public async saveGroup(input: {id?: string; name: string; description?: string; color?: string;}): Promise<string> {
        const service = ClusterNodeGroupServiceDB.getInstance();
        const entity = input.id !== undefined && input.id !== ''
            ? await service.findOne(input.id) ?? new ClusterNodeGroupDB()
            : new ClusterNodeGroupDB();

        entity.name = input.name;
        entity.description = input.description ?? '';
        entity.color = input.color ?? '';

        const saved = await service.save(entity);

        return saved.id;
    }

    /**
     * Delete a node group and all its memberships + sharing rules (dangling references
     * would otherwise point at a gone group). Tombstones every deleted id so the delete
     * durably converges cluster-wide (9.5.12.8 fix), not just on this node.
     * @param id - the group id
     */
    public async deleteGroup(id: string): Promise<void> {
        const members = await ClusterNodeGroupMemberServiceDB.getInstance().getRepository().find({where: {group_uuid: id}});
        const shares = await ClusterNodeGroupShareServiceDB.getInstance().getRepository().find({where: {group_uuid: id}});

        await ClusterNodeGroupMemberServiceDB.getInstance().getRepository().delete({group_uuid: id});
        await ClusterNodeGroupShareServiceDB.getInstance().getRepository().delete({group_uuid: id});
        await ClusterNodeGroupServiceDB.getInstance().remove(id);

        for (const member of members) {
            // eslint-disable-next-line no-await-in-loop -- a handful of rows at most; sequential keeps this simple
            await ClusterTombstoneRecorder.record(`node_group_member:${member.id}`);
        }

        for (const share of shares) {
            // eslint-disable-next-line no-await-in-loop -- a handful of rows at most; sequential keeps this simple
            await ClusterTombstoneRecorder.record(`node_group_share:${share.id}`);
        }

        await ClusterTombstoneRecorder.record(`node_group:${id}`);
    }

    /**
     * Add (`member: true`) or remove (`member: false`) a node from a group. Idempotent:
     * adding an existing membership is a no-op, removing an absent one likewise.
     * @param nodeUid - the member node's mesh UUID
     * @param groupUuid - the group id
     * @param member - the desired membership state
     */
    public async setMembership(nodeUid: string, groupUuid: string, member: boolean): Promise<void> {
        const service = ClusterNodeGroupMemberServiceDB.getInstance();
        const existing = await service.getRepository().findOne({where: {node_uid: nodeUid, group_uuid: groupUuid}});

        if (member) {
            if (existing === null) {
                const entity = new ClusterNodeGroupMemberDB();
                entity.node_uid = nodeUid;
                entity.group_uuid = groupUuid;
                await service.save(entity);
            }

            return;
        }

        if (existing !== null) {
            await service.remove(existing.id);
            await ClusterTombstoneRecorder.record(`node_group_member:${existing.id}`);
        }
    }

    /**
     * Grant (or change) a sharing rule: node `nodeUid` shares its `resourceType` resources
     * with group `groupUuid` at `level` (`read` or `write`). Upserts by the natural key
     * (nodeUid, groupUuid, resourceType) — setting a level again just changes it, no
     * duplicate rows.
     * @param nodeUid - the sharing node's mesh UUID
     * @param groupUuid - the target group id
     * @param resourceType - the shared resource type (e.g. `domain`)
     * @param level - `read` or `write`
     */
    public async setShare(nodeUid: string, groupUuid: string, resourceType: string, level: string): Promise<void> {
        const service = ClusterNodeGroupShareServiceDB.getInstance();
        const existing = await service.getRepository().findOne({
            where: {node_uid: nodeUid, group_uuid: groupUuid, resource_type: resourceType}
        });

        const entity = existing ?? new ClusterNodeGroupShareDB();

        entity.node_uid = nodeUid;
        entity.group_uuid = groupUuid;
        entity.resource_type = resourceType;
        entity.level = level;

        await service.save(entity);
    }

    /**
     * Revoke a sharing rule (default-deny: the resource type stops crossing the node
     * boundary to the group). A no-op if no such rule exists. Tombstones the deleted id
     * so the revoke durably converges cluster-wide (9.5.12.8 fix) — without this, a node
     * that already had this share converged into its own DB would keep re-publishing its
     * stale copy and silently resurrect it.
     * @param nodeUid - the sharing node's mesh UUID
     * @param groupUuid - the target group id
     * @param resourceType - the shared resource type
     */
    public async removeShare(nodeUid: string, groupUuid: string, resourceType: string): Promise<void> {
        const service = ClusterNodeGroupShareServiceDB.getInstance();
        const existing = await service.getRepository().findOne({
            where: {node_uid: nodeUid, group_uuid: groupUuid, resource_type: resourceType}
        });

        if (existing !== null) {
            await service.remove(existing.id);
            await ClusterTombstoneRecorder.record(`node_group_share:${existing.id}`);
        }
    }

}