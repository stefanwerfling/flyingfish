import {Plugin} from 'flyingfish_core';
import {ProviderLoader} from './ProviderLoader.js';

export default class LetsEncrypt extends Plugin {

    /**
     * getName
     */
    public getName(): string {
        return 'LetsEncrypt';
    }

    /**
     * onDisable
     */
    public onDisable(): boolean {
        return false;
    }

    /**
     * onEnable
     */
    public onEnable(): boolean {
        const pl = new ProviderLoader();

        this.getPluginManager().registerEvents(pl, this);

        return true;
    }

}