import {Plugin} from 'flyingfish_core';
import {ProviderLoader} from './ProviderLoader.js';

/**
 * LetsEncrypt Plugin.
 */
export default class LetsEncrypt extends Plugin {

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
        const pl = new ProviderLoader();

        this.getPluginManager().registerEvents(pl, this);

        return true;
    }

}