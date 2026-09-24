import {RbacPermissionService} from '../Db/MariaDb/Service/RbacPermissionService.js';
import {RbacRoleAssignmentService} from '../Db/MariaDb/Service/RbacRoleAssignmentService.js';
import {RbacRolePermissionService} from '../Db/MariaDb/Service/RbacRolePermissionService.js';
import {RbacUserGroupService} from '../Db/MariaDb/Service/RbacUserGroupService.js';
import {IRbacDataSource, RbacAssignment} from './PermissionService.js';

/**
 * The database-backed {@link IRbacDataSource} (RBAC epic 9.5.13): resolves a user's
 * groups, their role grants and those roles' permission keys from the rbac_* tables
 * via the DB services. This is what the production {@link PermissionService} runs on.
 */
export class RbacDbDataSource implements IRbacDataSource {

    /**
     * @inheritDoc
     */
    public async groupIdsForUser(userId: number): Promise<string[]> {
        return RbacUserGroupService.getInstance().groupIdsForUser(userId);
    }

    /**
     * @inheritDoc
     */
    public async assignmentsForGroups(groupIds: string[]): Promise<RbacAssignment[]> {
        const rows = await RbacRoleAssignmentService.getInstance().findByGroups(groupIds);

        return rows.map((row) => ({
            roleId: row.role_id,
            resourceType: row.resource_type,
            resourceId: row.resource_id,
            resourceUuid: row.resource_uuid
        }));
    }

    /**
     * @inheritDoc
     */
    public async permissionKeysForRoles(roleIds: string[]): Promise<string[]> {
        const permissionIds = await RbacRolePermissionService.getInstance().permissionIdsForRoles(roleIds);

        return RbacPermissionService.getInstance().keysForIds(permissionIds);
    }

}