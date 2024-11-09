import {PluginDefinition} from './PluginDefinition.js';
import {PluginManager} from './PluginManager.js';

/**
 * Abstract Plugin class
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
     * @param {PluginDefinition} info
     * @param {PluginManager} pm
     */
    public constructor(info: PluginDefinition, pm: PluginManager) {
        this._info = info;
        this._pluginManager = pm;
    }

    /**
     * getPluginManager
     * @protected
     * @returns {PluginManager}
     */
    protected getPluginManager(): PluginManager {
        return this._pluginManager;
    }

    /**
     * plugin name
     * @returns {string}
     */
    public abstract getName(): string;

    /**
     * onEnable
     * @returns {boolean}
     */
    public abstract onEnable(): boolean;

    /**
     * onDisable
     * @returns {boolean}
     */
    public abstract onDisable(): boolean;

}