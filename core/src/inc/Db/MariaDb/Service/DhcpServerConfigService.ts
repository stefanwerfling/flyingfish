import {DBService} from '../DBService.js';
import {DhcpServerConfig} from '../Entity/DhcpServerConfig.js';

/**
 * Service for the LAN DHCP server config table (Pi-router epic). Effectively a
 * singleton per node — {@link DhcpServerConfigService.get} returns the single row.
 */
export class DhcpServerConfigService extends DBService<DhcpServerConfig> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'dhcp_server_config';

    /**
     * getInstance
     * @returns {DhcpServerConfigService}
     */
    public static getInstance(): DhcpServerConfigService {
        return DBService.getSingleInstance(DhcpServerConfigService, DhcpServerConfig, DhcpServerConfigService.REGISTER_NAME);
    }

    /**
     * The node's single DHCP server config row, or null if none is configured yet.
     * @returns {DhcpServerConfig | null}
     */
    public async get(): Promise<DhcpServerConfig | null> {
        const rows = await this._repository.find({order: {id: 'ASC'}, take: 1});

        return rows[0] ?? null;
    }

}