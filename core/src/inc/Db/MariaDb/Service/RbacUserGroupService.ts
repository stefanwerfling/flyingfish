import {In} from 'typeorm';
import {DBService} from '../DBService.js';
import {RbacUserGroup} from '../Entity/RbacUserGroup.js';

/**
 * Service for the user↔group membership table (RBAC epic 9.5.13).
 */
export class RbacUserGroupService extends DBService<RbacUserGroup> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'rbac_user_group';

    /**
     * getInstance
     * @returns {RbacUserGroupService}
     */
    public static getInstance(): RbacUserGroupService {
        return DBService.getSingleInstance(RbacUserGroupService, RbacUserGroup, RbacUserGroupService.REGISTER_NAME);
    }

    /**
     * The group ids a user belongs to.
     * @param {number} userId
     * @returns {number[]}
     */
    public async groupIdsForUser(userId: number): Promise<number[]> {
        const rows = await this._repository.find({where: {user_id: userId}});

        return rows.map((row) => row.group_id);
    }

    /**
     * The user ids belonging to any of the given groups.
     * @param {number[]} groupIds
     * @returns {number[]}
     */
    public async userIdsForGroups(groupIds: number[]): Promise<number[]> {
        if (groupIds.length === 0) {
            return [];
        }

        const rows = await this._repository.find({where: {group_id: In(groupIds)}});

        return rows.map((row) => row.user_id);
    }

}