import {DBService} from '../DBService.js';
import {RbacRole} from '../Entity/RbacRole.js';

/**
 * Service for the RBAC role table (epic 9.5.13). CRUD via the DBService base.
 */
export class RbacRoleService extends DBService<RbacRole> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'rbac_role';

    /**
     * getInstance
     * @returns {RbacRoleService}
     */
    public static getInstance(): RbacRoleService {
        return DBService.getSingleInstance(RbacRoleService, RbacRole, RbacRoleService.REGISTER_NAME);
    }

}