import {PluginDefinition} from './PluginDefinition.js';

/**
 * Plugin
 */
export abstract class Plugin {

    /**
     * plugin information by package.json
     * @protected
     */
    protected _info: PluginDefinition;

    /**
     * constructor
     * @param info
     */
    public constructor(info: PluginDefinition) {
        this._info = info;
    }

    /**
     * plugin name
     */
    public abstract getName(): string;

    /**
     * onEnable
     */
    public abstract onEnable(): boolean;

    /**
     * onDisable
     */
    public abstract onDisable(): boolean;

}