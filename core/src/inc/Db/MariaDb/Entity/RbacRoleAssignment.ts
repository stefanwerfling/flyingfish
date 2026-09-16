import {Entity, Column} from 'typeorm';
import {DBBaseEntityUuid} from '../DBBaseEntityUuid.js';

/**
 * RbacRoleAssignment — grants a role to a group, optionally scoped to a resource
 * (RBAC epic 9.5.13). This is what makes rights per-resource: an empty `resource_type`
 * (and `resource_id` 0) is a GLOBAL grant; otherwise the grant applies only to that
 * resource, e.g. resource_type `domain` + resource_id the domain id. Plain id-column
 * join, no DB foreign keys. A cluster-global POLICY entity: its own id and the
 * group/role refs are cluster-stable UUIDs so the grant gossips/shares across nodes
 * (9.5.12, A+C). `resource_id` stays a node-local int for now (cluster-stable resource
 * references are a follow-up — see [[rbac-cluster-global-uuid]]).
 */
@Entity({name: 'rbac_role_assignment'})
export class RbacRoleAssignment extends DBBaseEntityUuid {

    /**
     * the group the role is granted to (UUID of a cluster-global rbac_group)
     */
    @Column({
        type: 'varchar',
        length: 36,
        default: ''
    })
    public group_id!: string;

    /**
     * the granted role (UUID of a cluster-global rbac_role)
     */
    @Column({
        type: 'varchar',
        length: 36,
        default: ''
    })
    public role_id!: string;

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