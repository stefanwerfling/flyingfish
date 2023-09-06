import {Plugin} from 'flyingfish_core';
import {LoadDb} from './LoadDb.js';

/**
 * DemoPlugin
 */
export default class DemoPlugin extends Plugin {

    /**
     * getName
     */
    public getName(): string {
        return 'DemoPlugin';
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
        // register Db table loads
        this.getPluginManager().registerEvents(new LoadDb(), this);

        return false;
    }

}