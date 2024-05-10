import {APlugin, PluginServiceNames} from 'flyingfish_core';
import {LoadDb} from './LoadDb.js';

/**
 * DemoPlugin
 */
export default class DemoPlugin extends APlugin {

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
        if (this.getPluginManager().getServiceName() === PluginServiceNames.backend) {
            // register Db table loads
            this.getPluginManager().registerEvents(new LoadDb(), this);
        }

        return false;
    }

}