import {DBService} from './DBService.js';
import {DynDnsClientDomain} from './Entity/DynDnsClientDomain.js';

/**
 * DynDnsClientDomainService
 */
export class DynDnsClientDomainService extends DBService<DynDnsClientDomain> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'dyndns_client_domain';

    /**
     * getInstance
     */
    public static getInstance(): DynDnsClientDomainService {
        return DBService.getSingleInstance(
            DynDnsClientDomainService,
            DynDnsClientDomain,
            DynDnsClientDomainService.REGISTER_NAME
        );
    }

}