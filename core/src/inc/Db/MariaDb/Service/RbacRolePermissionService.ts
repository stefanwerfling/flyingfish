import {In} from 'typeorm';
import {DBService} from '../DBService.js';
import {RbacRolePermission} from '../Entity/RbacRolePermission.js';

/**
 * Service for the role↔permission table (RBAC epic 9.5.13).
 */
export class RbacRolePermissionService extends DBService<RbacRolePermission> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'rbac_role_permission';

    /**
     * getInstance
     * @returns {RbacRolePermissionService}
     */
    public static getInstance(): RbacRolePermissionService {
        return DBService.getSingleInstance(RbacRolePermissionService, RbacRolePermission, RbacRolePermissionService.REGISTER_NAME);
    }

    /**
     * The permission ids held by any of the given roles (cluster-stable UUIDs).
     * @param {string[]} roleIds
     * @returns {string[]}
     */
    public async permissionIdsForRoles(roleIds: string[]): Promise<string[]> {
        if (roleIds.length === 0) {
            return [];
        }

        const rows = await this._repository.find({where: {role_id: In(roleIds)}});

        return rows.map((row) => row.permission_id);
    }

}