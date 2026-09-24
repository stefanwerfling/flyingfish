import {
    ClusterNodeGroupDB,
    ClusterNodeGroupMemberDB,
    ClusterNodeGroupMemberServiceDB,
    ClusterNodeGroupServiceDB
} from 'flyingfish_core';

/**
 * The write side of the cluster node groups (Cluster/Mesh epic 9.5.12.3). CRUD on the
 * LOCAL cluster_node_group* tables; the change is gossiped cluster-wide on the next sync
 * ({@link ClusterLocalStateProvider} publishes them global, every node's
 * {@link ClusterNodeGroupConverger} upserts them). A group is created on whichever node
 * the admin is on and converges everywhere — no central owner. Read goes through the
 * aggregated gossip view (aggregateClusterNodeGroups), not this class.
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
     * Delete a node group and all its memberships (a dangling membership would otherwise
     * reference a gone group).
     * @param id - the group id
     */
    public async deleteGroup(id: string): Promise<void> {
        await ClusterNodeGroupMemberServiceDB.getInstance().getRepository().delete({group_uuid: id});
        await ClusterNodeGroupServiceDB.getInstance().remove(id);
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
        }
    }

}