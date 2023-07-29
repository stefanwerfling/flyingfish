import {DBService} from './DBService.js';
import {DynDnsServerDomain} from './Entity/DynDnsServerDomain.js';

/**
 * DynDnsServerDomainService
 */
export class DynDnsServerDomainService extends DBService<DynDnsServerDomain> {

    /**
     * getInstance
     */
    public static getInstance(): DynDnsServerDomainService {
        return DBService.getSingleInstance(
            DynDnsServerDomainService,
            DynDnsServerDomain,
            'dyndns_server_domain'
        );
    }

}