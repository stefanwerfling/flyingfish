import {Entity, Column} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * RbacRolePermission — the many-to-many binding of a permission to a role (RBAC epic
 * 9.5.13). Plain id-column join.
 */
@Entity({name: 'rbac_role_permission'})
export class RbacRolePermission extends DBBaseEntityId {

    /**
     * the role
     */
    @Column({
        default: 0
    })
    public role_id!: number;

    /**
     * the permission granted to the role
     */
    @Column({
        default: 0
    })
    public permission_id!: number;

}