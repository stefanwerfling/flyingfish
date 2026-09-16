import {In} from 'typeorm';
import {DBService} from '../DBService.js';
import {RbacRoleAssignment} from '../Entity/RbacRoleAssignment.js';

/**
 * Service for the role grants table (RBAC epic 9.5.13): which role a group holds and
 * on which resource scope.
 */
export class RbacRoleAssignmentService extends DBService<RbacRoleAssignment> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'rbac_role_assignment';

    /**
     * getInstance
     * @returns {RbacRoleAssignmentService}
     */
    public static getInstance(): RbacRoleAssignmentService {
        return DBService.getSingleInstance(RbacRoleAssignmentService, RbacRoleAssignment, RbacRoleAssignmentService.REGISTER_NAME);
    }

    /**
     * The role grants of the given groups (cluster-stable group UUIDs).
     * @param {string[]} groupIds
     * @returns {RbacRoleAssignment[]}
     */
    public async findByGroups(groupIds: string[]): Promise<RbacRoleAssignment[]> {
        if (groupIds.length === 0) {
            return [];
        }

        return this._repository.find({where: {group_id: In(groupIds)}});
    }

}