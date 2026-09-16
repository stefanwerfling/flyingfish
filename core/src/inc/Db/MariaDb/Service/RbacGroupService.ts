import {DBService} from '../DBService.js';
import {RbacGroup} from '../Entity/RbacGroup.js';

/**
 * Service for the RBAC group table (epic 9.5.13). CRUD via the DBService base.
 */
export class RbacGroupService extends DBService<RbacGroup> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'rbac_group';

    /**
     * getInstance
     * @returns {RbacGroupService}
     */
    public static getInstance(): RbacGroupService {
        return DBService.getSingleInstance(RbacGroupService, RbacGroup, RbacGroupService.REGISTER_NAME);
    }

}