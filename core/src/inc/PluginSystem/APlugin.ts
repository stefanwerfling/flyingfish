import {PluginDefinition} from './PluginDefinition.js';
import {PluginManager} from './PluginManager.js';
import {PluginServiceNames} from './PluginServiceNames.js';

/**
 * Plugin
 */
export abstract class APlugin {

    /**
     * plugin information by package.json
     * @protected
     */
    protected _info: PluginDefinition;

    /**
     * plugin manager
     * @private
     */
    private _pluginManager: PluginManager;

    /**
     * constructor
     * @param info
     */
    public constructor(info: PluginDefinition, pm: PluginManager) {
        this._info = info;
        this._pluginManager = pm;
    }

    /**
     * getPluginManager
     * @protected
     */
    protected getPluginManager(): PluginManager {
        return this._pluginManager;
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