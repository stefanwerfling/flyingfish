import {Entity, Column} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * RbacRoleAssignment — grants a role to a group, optionally scoped to a resource
 * (RBAC epic 9.5.13). This is what makes rights per-resource: an empty `resource_type`
 * (and `resource_id` 0) is a GLOBAL grant; otherwise the grant applies only to that
 * resource, e.g. resource_type `domain` + resource_id the domain id. Plain id-column
 * join, no DB foreign keys.
 */
@Entity({name: 'rbac_role_assignment'})
export class RbacRoleAssignment extends DBBaseEntityId {

    /**
     * the group the role is granted to
     */
    @Column({
        default: 0
    })
    public group_id!: number;

    /**
     * the granted role
     */
    @Column({
        default: 0
    })
    public role_id!: number;

    /**
     * the resource type this grant is scoped to (empty = global)
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public resource_type!: string;

    /**
     * the resource id this grant is scoped to (0 = none/global)
     */
    @Column({
        default: 0
    })
    public resource_id!: number;

}