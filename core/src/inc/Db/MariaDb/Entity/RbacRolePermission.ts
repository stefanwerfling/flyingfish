import {Entity, Column} from 'typeorm';
import {DBBaseEntityUuid} from '../DBBaseEntityUuid.js';

/**
 * RbacRolePermission — the many-to-many binding of a permission to a role (RBAC epic
 * 9.5.13). Plain id-column join. A cluster-global POLICY entity: its own id and both
 * refs are cluster-stable UUIDs so the binding gossips/shares across nodes (9.5.12,
 * A+C).
 */
@Entity({name: 'rbac_role_permission'})
export class RbacRolePermission extends DBBaseEntityUuid {

    /**
     * the role (UUID of a cluster-global rbac_role)
     */
    @Column({
        type: 'varchar',
        length: 36,
        default: ''
    })
    public role_id!: string;

    /**
     * the permission granted to the role (UUID of a cluster-global rbac_permission)
     */
    @Column({
        type: 'varchar',
        length: 36,
        default: ''
    })
    public permission_id!: string;

}