import {APlugin, PluginServiceNames} from 'flyingfish_core';
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
     * @returns {boolean}
     */
    public onDisable(): boolean {
        return false;
    }

    /**
     * Enable the plugin, create and register the event.
     * @returns {boolean}
     */
    public onEnable(): boolean {
        if (this.getPluginManager().getServiceName() === PluginServiceNames.backend) {
            this.getPluginManager().registerEvents(new SslCertProviderLoader(), this);
        }

        return true;
    }

}