import {Ets} from 'ets';
import path from 'path';
import {SchemaErrors} from 'vts';
import {Logger} from '../Logger/Logger.js';
import {DirHelper} from '../Utils/DirHelper.js';
import {FileHelper} from '../Utils/FileHelper.js';
import {APlugin} from './APlugin.js';
import {PluginDefinition, SchemaPluginDefinition} from './PluginDefinition.js';
import {APluginEvent} from './APluginEvent.js';
import {PluginServiceNames} from './PluginServiceNames.js';

/**
 * PluginInformation
 */
export type PluginInformation = {
    definition: PluginDefinition;
    path: string;
};

/**
 * Plugin manager controll the plugin loading and event registering.
 */
export class PluginManager {

    /**
     * plugin manager instance
     * @protected
     */
    protected static _instance: PluginManager|null = null;

    /**
     * app path for node_modules
     * @protected
     */
    protected _appPath: string;

    /**
     * Service name from service instance (name of the system in which the plugin works).
     * @member {PluginServiceNames|string}
     */
    protected _serviceName: PluginServiceNames|string;

    /**
     * Plugin loading list.
     * @member {APlugin[]}
     */
    protected _plugins: APlugin[] = [];

    /**
     * events
     * @member {Map<string, APluginEvent[]>}
     */
    protected _events: Map<string, APluginEvent[]> = new Map<string, APluginEvent[]>();

    /**
     * Retrung a plugin manager instance or throw error by wrong initalition.
     * @returns {PluginManager}
     */
    public static getInstance(): PluginManager {
        if (PluginManager._instance === null) {
            throw new Error('PluginManager::getInstance: instance is empty, please init first plugin manager!');
        }

        return PluginManager._instance;
    }

    /**
     * Constructor
     * @param {PluginServiceNames|string} serviceName - Service name, name who starts the plugin manager.
     * @param {string} appPath - Path-to-modules directory.
     */
    public constructor(serviceName: PluginServiceNames|string, appPath?: string) {
        if (appPath) {
            this._appPath = appPath;
        }

        this._appPath = path.join(path.resolve());
        this._serviceName = serviceName;

        PluginManager._instance = this;
    }

    /**
     * Return the service name
     * @returns {PluginServiceNames|string}
     */
    public getServiceName(): PluginServiceNames|string {
        return this._serviceName;
    }

    /**
     * Start all loaded plugins.
     */
    public async start(): Promise<void> {
        const pluginInfos = await this.scan();

        for await (const pluginInfo of pluginInfos) {
            Logger.getLogger().silly(
                `PluginManager::start: found plugin: ${pluginInfo.definition.name} (${pluginInfo.definition.version})`
            );

            await this.load(pluginInfo);
        }
    }

    /**
     * Scan all modules for plugin information.
     * @returns {PluginInformation[]}
     */
    public async scan(): Promise<PluginInformation[]> {
        let nodeModulesPath = path.join(this._appPath, 'node_modules');

        if (!await FileHelper.directoryExist(nodeModulesPath)) {
            nodeModulesPath = path.join(this._appPath, 'node_modules', this._serviceName);

            if (!await FileHelper.directoryExist(nodeModulesPath)) {
                throw new Error(`node_modules directory not found: ${nodeModulesPath}`);
            }
        }

        const modules = await DirHelper.readdir(nodeModulesPath);
        const informations: PluginInformation[] = [];

        for await (const aModule of modules) {
            const packageJsonPath = path.join(nodeModulesPath, aModule);

            if (await FileHelper.directoryExist(packageJsonPath)) {
                try {
                    const packageFile = path.join(packageJsonPath, 'package.json');
                    const packetData = await FileHelper.readJsonFile(packageFile);

                    if (packetData) {
                        if (packetData.flyingfish) {
                            const errors: SchemaErrors = [];

                            if (SchemaPluginDefinition.validate(packetData.flyingfish, errors)) {
                                informations.push({
                                    definition: packetData.flyingfish,
                                    path: packageJsonPath
                                });
                            } else {
                                console.log('PluginManager::scan: Config file error:');
                                console.log(JSON.stringify(errors, null, 2));
                            }
                        }
                    }
                } catch (e) {
                    Logger.getLogger().warn('PluginManager::scan: package.json can not read/parse');
                }
            }
        }

        return informations;
    }

    /**
     * Load plugin to plugin-managaer by plugin information.
     * @param {PluginInformation} plugin - Plugin information.
     * @returns {boolean} Return true when is loaded.
     * @throws
     */
    public async load(plugin: PluginInformation): Promise<boolean> {
        try {
            let importFile: string|null = null;

            const pluginMain = path.join(plugin.path, plugin.definition.main);

            if (await FileHelper.fileExist(pluginMain, true)) {
                importFile = pluginMain;
            }

            if (plugin.definition.main_directory) {
                for await (const dir of plugin.definition.main_directory) {
                    const pluginSubMain = path.join(plugin.path, dir, plugin.definition.main);

                    if (await FileHelper.fileExist(pluginSubMain, true)) {
                        importFile = pluginSubMain;
                        break;
                    }
                }
            }

            if (importFile === null) {
                throw new Error(`plugin main not found: ${plugin.path}`);
            }

            Logger.getLogger().silly(`PluginManager::load: file plugin: ${importFile} (${plugin.definition.name})`);

            const oPlugin = await import(importFile);

            console.log(oPlugin);

            const object = new oPlugin.default(plugin, this) as APlugin;

            if (object) {
                this._plugins.push(object);
                object.onEnable();

                Logger.getLogger().info(`PluginManager::load: Plugin is loaded ${plugin.definition.name}`);
            }
        } catch (e) {
            Logger.getLogger().error(`PluginManager::load: can not load plugin: ${plugin.definition.name}`);
            Logger.getLogger().error(Ets.formate(e, true));
            return false;
        }

        return true;
    }

    /**
     * Return all plugins.
     * @returns {APlugin[]}
     */
    public getPlugins(): APlugin[] {
        return this._plugins;
    }

    /**
     * Return a plugin by plugin-name.
     * @param {string} name - Name of a plugin.
     * @returns {APlugin|null}
     */
    public getPlugin(name: string): APlugin|null {
        const plugin = this._plugins.find((e) => e.getName() === name);

        if (plugin) {
            return plugin;
        }

        return null;
    }

    /**
     * Register an event, called from plugin.
     * @param {APluginEvent} listner - Listner event object.
     * @param {APlugin} plugin - A plugin instance.
     */
    public registerEvents(listner: APluginEvent, plugin: APlugin): void {
        const pluginName = plugin.getName();

        if (!this._events.has(pluginName)) {
            this._events.set(pluginName, []);
        }

        const events = this._events.get(pluginName);

        if (events) {
            events.push(listner);

            this._events.set(pluginName, events);
        }
    }

    /**
     * Return all Events
     * @param {Function} aClass
     * @returns {APluginEvent[]}
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    public getAllEvents<T extends APluginEvent>(aClass: Function): T[] {
        const eventList: T[] = [];

        for (const [, events] of this._events) {
            for (const aEvent of events) {
                if (aEvent instanceof aClass) {
                    eventList.push(aEvent as T);
                }
            }
        }

        return eventList;
    }

}