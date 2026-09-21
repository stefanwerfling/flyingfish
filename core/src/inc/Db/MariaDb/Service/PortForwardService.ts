import {DBService} from '../DBService.js';
import {PortForward} from '../Entity/PortForward.js';

/**
 * Service for the port-forwarding / inbound firewall-rule table (Pi-router epic, Phase 2).
 */
export class PortForwardService extends DBService<PortForward> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'port_forward';

    /**
     * getInstance
     * @returns {PortForwardService}
     */
    public static getInstance(): PortForwardService {
        return DBService.getSingleInstance(PortForwardService, PortForward, PortForwardService.REGISTER_NAME);
    }

    /**
     * All rules, ordered by WAN port for a stable UI list.
     * @returns {PortForward[]}
     */
    public async findAllRules(): Promise<PortForward[]> {
        return this._repository.find({order: {wan_port: 'ASC'}});
    }

}
