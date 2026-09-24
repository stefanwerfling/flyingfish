import {Entity, Column} from 'typeorm';
import {DBBaseEntityUuid} from '../DBBaseEntityUuid.js';

/**
 * ClusterNodeGroupMember — one node's membership in one {@link ClusterNodeGroup}
 * (Cluster/Mesh epic 9.5.12.3, n:m). Both refs are cluster-stable: `node_uid` is the
 * node's mesh UUID (the same id the gossip roster uses), `group_uuid` the group's id.
 *
 * A cluster-global POLICY entity with a UUID id, so a membership created on any node
 * gossips out and the LWW store converges cluster-wide — no per-node namespace.
 */
@Entity({name: 'cluster_node_group_member'})
export class ClusterNodeGroupMember extends DBBaseEntityUuid {

    /**
     * the member node's cluster mesh UUID
     */
    @Column({
        type: 'varchar',
        length: 36,
        default: ''
    })
    public node_uid!: string;

    /**
     * the group's UUID ({@link ClusterNodeGroup.id})
     */
    @Column({
        type: 'varchar',
        length: 36,
        default: ''
    })
    public group_uuid!: string;

}