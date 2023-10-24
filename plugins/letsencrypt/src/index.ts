import {Plugin} from 'flyingfish_core';
import {Certbot} from './Certbot.js';

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
        this.getPluginManager().registerEvents(new Certbot(), this);
        return true;
    }

}