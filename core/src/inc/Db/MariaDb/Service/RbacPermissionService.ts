import {In} from 'typeorm';
import {DBService} from '../DBService.js';
import {RbacPermission} from '../Entity/RbacPermission.js';

/**
 * Service for the permission table (RBAC epic 9.5.13).
 */
export class RbacPermissionService extends DBService<RbacPermission> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'rbac_permission';

    /**
     * getInstance
     * @returns {RbacPermissionService}
     */
    public static getInstance(): RbacPermissionService {
        return DBService.getSingleInstance(RbacPermissionService, RbacPermission, RbacPermissionService.REGISTER_NAME);
    }

    /**
     * The permission keys for the given permission ids.
     * @param {number[]} ids
     * @returns {string[]}
     */
    public async keysForIds(ids: number[]): Promise<string[]> {
        if (ids.length === 0) {
            return [];
        }

        const rows = await this._repository.find({where: {id: In(ids)}});

        return rows.map((row) => row.permission_key);
    }

}