import {Entity, Column} from 'typeorm';
import {DBBaseEntityUuid} from '../DBBaseEntityUuid.js';

/**
 * ClusterNodeGroup — a group of cluster NODES ("zone"/"pool"; Cluster/Mesh epic
 * 9.5.12.3). A node can belong to several groups (n:m via {@link ClusterNodeGroupMember}).
 * Deliberately distinct from the RBAC {@link RbacGroup} (a group of USERS): a node group
 * is the boundary a node shares resources across, an RBAC grant then says who may do what
 * inside it (9.5.12.4).
 *
 * A cluster-global POLICY entity: its UUID id is stable cluster-wide so the group can be
 * gossiped and shared across nodes (same pattern as the RBAC policy — every node
 * converges on the same set, no per-node namespace).
 */
@Entity({name: 'cluster_node_group'})
export class ClusterNodeGroup extends DBBaseEntityUuid {

    /**
     * group name
     */
    @Column({
        type: 'varchar',
        length: 255
    })
    public name!: string;

    /**
     * description
     */
    @Column({
        type: 'varchar',
        length: 512,
        default: ''
    })
    public description!: string;

    /**
     * colour label (hex, e.g. `#12919f`) shown for the group in the node tree and the
     * membership matrix; empty = the UI picks a default.
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public color!: string;

}