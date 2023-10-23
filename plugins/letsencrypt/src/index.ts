import {Plugin} from 'flyingfish_core';

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

        return true;
    }

}