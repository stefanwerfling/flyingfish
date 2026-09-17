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
     * The DHCP server config for a specific LAN interface, or null if none exists yet.
     * @param {number} interfaceId - the LAN NetworkInterface id
     * @returns {DhcpServerConfig | null}
     */
    public async findByInterface(interfaceId: number): Promise<DhcpServerConfig | null> {
        return this._repository.findOne({where: {network_interface_id: interfaceId}});
    }

    /**
     * All DHCP server configs (one per LAN interface).
     * @returns {DhcpServerConfig[]}
     */
    public async findAllConfigs(): Promise<DhcpServerConfig[]> {
        return this._repository.find({order: {id: 'ASC'}});
    }

    /**
     * The first DHCP server config row, or null. Kept for the legacy single-config
     * callers; new code should prefer {@link DhcpServerConfigService.findByInterface}.
     * @returns {DhcpServerConfig | null}
     */
    public async get(): Promise<DhcpServerConfig | null> {
        const rows = await this._repository.find({order: {id: 'ASC'}, take: 1});

        return rows[0] ?? null;
    }

}