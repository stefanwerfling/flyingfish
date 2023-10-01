import {DBService} from './DBService.js';
import {SshUser} from './Entity/SshUser.js';

/**
 * Ssh user service object.
 */
export class SshUserService extends DBService<SshUser> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'ssh_user';

    /**
     * Return an intance from ssh user service.
     * @returns {SshUserService}
     */
    public static getInstance(): SshUserService {
        return DBService.getSingleInstance(
            SshUserService,
            SshUser,
            SshUserService.REGISTER_NAME
        );
    }

}