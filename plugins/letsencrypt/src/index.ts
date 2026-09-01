import {APlugin, Logger, PluginServiceNames} from 'flyingfish_core';
import {SslCertProviderLoader} from './SslCertProviderLoader.js';

/**
 * LetsEncrypt Plugin.
 */
export default class LetsEncrypt extends APlugin {

    /**
     * Return the name of the plugin.
     * @returns {string}
     */
    public getName(): string {
        return 'LetsEncrypt';
    }

    /**
     * Disable the plugin.
     * @returns {Promise<boolean>}
     */
    public async onDisable(): Promise<boolean> {
        return false;
    }

    /**
     * Enable the plugin, create and register the event.
     * @returns {Promise<boolean>}
     */
    public async onEnable(): Promise<boolean> {
        if (this.getPluginManager().getServiceName() === PluginServiceNames.backend) {
            this.getPluginManager().registerEvents(new SslCertProviderLoader(), this);
        } else {
            Logger.getLogger().warn('The LetsEncrypt plugin can only load from backend.', {
                class: 'Plugin::LetsEncrypt::onEnable'
            });
        }

        return true;
    }

}