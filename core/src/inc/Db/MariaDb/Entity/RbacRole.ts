import {Entity, Column} from 'typeorm';
import {DBBaseEntityUuid} from '../DBBaseEntityUuid.js';

/**
 * RbacRole — a named bundle of permissions (RBAC epic 9.5.13). Roles hold
 * permissions (rbac_role_permission) and are assigned to groups, optionally scoped to
 * a resource (rbac_role_assignment). A cluster-global POLICY entity keyed by a
 * cluster-stable UUID so it can be gossiped/shared across nodes (9.5.12, A+C).
 */
@Entity({name: 'rbac_role'})
export class RbacRole extends DBBaseEntityUuid {

    /**
     * role name
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

}