import {DBService} from '../DBService.js';
import {DhcpLease} from '../Entity/DhcpLease.js';

/**
 * Service for the LAN DHCP lease table (Pi-router epic). A read model populated by
 * `ff-lan` from the dnsmasq lease file.
 */
export class DhcpLeaseService extends DBService<DhcpLease> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'dhcp_lease';

    /**
     * getInstance
     * @returns {DhcpLeaseService}
     */
    public static getInstance(): DhcpLeaseService {
        return DBService.getSingleInstance(DhcpLeaseService, DhcpLease, DhcpLeaseService.REGISTER_NAME);
    }

}