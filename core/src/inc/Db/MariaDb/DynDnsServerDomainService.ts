import {DBService} from './DBService.js';
import {DynDnsServerDomain} from './Entity/DynDnsServerDomain.js';

/**
 * DynDnsServerDomainService
 */
export class DynDnsServerDomainService extends DBService<DynDnsServerDomain> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'dyndns_server_domain';

    /**
     * getInstance
     */
    public static getInstance(): DynDnsServerDomainService {
        return DBService.getSingleInstance(
            DynDnsServerDomainService,
            DynDnsServerDomain,
            DynDnsServerDomainService.REGISTER_NAME
        );
    }

    /**
     * findByUser
     * @param userid
     */
    public async findByUser(userid: number): Promise<DynDnsServerDomain[]> {
        return this._repository.find({
            where: {
                user_id: userid
            }
        });
    }

}