import {DBService} from '../DBService.js';
import {SystemConfig} from '../Entity/SystemConfig.js';

/**
 * Service for the node's system_config table (operating mode + target settings).
 * Effectively a singleton per node — {@link SystemConfigService.get} returns the single
 * row (or null); {@link SystemConfigService.getOrCreate} returns it, creating a default
 * ('attach') row if none exists.
 */
export class SystemConfigService extends DBService<SystemConfig> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'system_config';

    /**
     * getInstance
     * @returns {SystemConfigService}
     */
    public static getInstance(): SystemConfigService {
        return DBService.getSingleInstance(SystemConfigService, SystemConfig, SystemConfigService.REGISTER_NAME);
    }

    /**
     * The node's single system-config row, or null if none exists yet.
     * @returns {SystemConfig | null}
     */
    public async get(): Promise<SystemConfig | null> {
        const rows = await this._repository.find({order: {id: 'ASC'}, take: 1});

        return rows[0] ?? null;
    }

    /**
     * The node's system-config row, creating a default ('attach') one if none exists.
     * @returns {SystemConfig}
     */
    public async getOrCreate(): Promise<SystemConfig> {
        const existing = await this.get();

        if (existing !== null) {
            return existing;
        }

        const config = new SystemConfig();
        config.mode = 'attach';
        config.target_ip = '';
        config.attach_interface = '';

        return this._repository.save(config);
    }

}
