import {Entity, Column} from 'typeorm';
import {DBBaseEntityUuid} from '../DBBaseEntityUuid.js';

/**
 * ClusterNodeGroupShare — one node's explicit sharing rule for a {@link ClusterNodeGroup}
 * (Cluster/Mesh epic 9.5.12.4): "node `node_uid` shares its `resource_type` resources with
 * group `group_uuid` at `level`". Default-deny: a resource type is invisible to a group
 * until a share row grants it. This is the FREIGABE-GRENZE (exposure boundary) — a
 * separate concern from RBAC: a share decides whether a resource type crosses the node
 * boundary to a group AT ALL, an RBAC grant scoped to that group then decides which users
 * may act on it (see the node-group-scoped grant, 9.5.12.4 part 2).
 *
 * A cluster-global POLICY entity with a UUID id, gossiped un-namespaced like
 * {@link ClusterNodeGroup} / {@link ClusterNodeGroupMember} — every node converges on the
 * same share set regardless of which node published it.
 */
@Entity({name: 'cluster_node_group_share'})
export class ClusterNodeGroupShare extends DBBaseEntityUuid {

    /**
     * the sharing node's cluster mesh UUID (the resource owner)
     */
    @Column({
        type: 'varchar',
        length: 36,
        default: ''
    })
    public node_uid!: string;

    /**
     * the group the resources are shared with ({@link ClusterNodeGroup.id})
     */
    @Column({
        type: 'varchar',
        length: 36,
        default: ''
    })
    public group_uuid!: string;

    /**
     * the shared resource type (free-form, e.g. `domain` — no central enum, same
     * convention as RBAC permission keys)
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public resource_type!: string;

    /**
     * access level granted to the group: `read` or `write` (write implies read)
     */
    @Column({
        type: 'varchar',
        length: 16,
        default: 'read'
    })
    public level!: string;

}
