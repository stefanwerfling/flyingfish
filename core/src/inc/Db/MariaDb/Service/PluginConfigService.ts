import {DBService} from '../DBService.js';
import {PluginConfig} from '../Entity/PluginConfig.js';

/**
 * PluginConfig service object. Access to per-plugin enabled state and config
 * values, keyed by the plugin manifest name.
 */
export class PluginConfigService extends DBService<PluginConfig> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'plugin_config';

    /**
     * Return an instance from plugin config service.
     * @returns {PluginConfigService}
     */
    public static getInstance(): PluginConfigService {
        return DBService.getSingleInstance(
            PluginConfigService,
            PluginConfig,
            PluginConfigService.REGISTER_NAME
        );
    }

    /**
     * Find a plugin config by plugin manifest name.
     * @param {string} name - Plugin manifest name.
     * @returns {PluginConfig|null}
     */
    public async findByName(name: string): Promise<PluginConfig|null> {
        return this._repository.findOne({
            where: {
                plugin_name: name
            }
        });
    }

}
