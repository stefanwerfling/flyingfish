import {DBService} from './DBService.js';
import {DynDnsServerUser} from './Entity/DynDnsServerUser.js';

/**
 * DynDnsServerUserService
 */
export class DynDnsServerUserService extends DBService<DynDnsServerUser> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'dyndns_server_user';

    /**
     * getInstance
     */
    public static getInstance(): DynDnsServerUserService {
        return DBService.getSingleInstance(
            DynDnsServerUserService,
            DynDnsServerUser,
            DynDnsServerUserService.REGISTER_NAME
        );
    }

    /**
     * findByName
     * @param name
     */
    public findByName(name: string): Promise<DynDnsServerUser | null> {
        return this._repository.findOne({
            where: {
                username: name
            }
        });
    }

}