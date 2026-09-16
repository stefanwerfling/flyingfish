import {Entity, Column} from 'typeorm';
import {DBBaseEntityUuid} from '../DBBaseEntityUuid.js';

/**
 * RbacGroup — a group of users (RBAC epic 9.5.13). Users belong to groups
 * (rbac_user_group), groups are granted roles on resources (rbac_role_assignment).
 * A cluster-global POLICY entity: its UUID id is stable cluster-wide so the group can
 * be gossiped and shared across nodes (Cluster/Mesh epic 9.5.12, A+C).
 */
@Entity({name: 'rbac_group'})
export class RbacGroup extends DBBaseEntityUuid {

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
     * disable the group (no rights take effect)
     */
    @Column({
        type: 'bool',
        default: false
    })
    public disable!: boolean;

}