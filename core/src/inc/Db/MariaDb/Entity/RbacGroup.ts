import {Entity, Column} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * RbacGroup — a group of users (RBAC epic 9.5.13). Users belong to groups
 * (rbac_user_group), groups are granted roles on resources (rbac_role_assignment).
 */
@Entity({name: 'rbac_group'})
export class RbacGroup extends DBBaseEntityId {

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