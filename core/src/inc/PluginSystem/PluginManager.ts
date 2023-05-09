import fs, {readFileSync} from 'fs';
import path from 'path';
import {SchemaErrors} from 'vts';
import {Logger} from '../Logger/Logger.js';
import {Plugin} from './Plugin.js';
import {PluginDefinition, SchemaPluginDefinition} from './PluginDefinition.js';

/**
 * PluginInformation
 */
export type PluginInformation = {
    definition: PluginDefinition;
    path: string;
};

/**
 * PluginManager
 */
export class PluginManager {

    /**
     * app path for node_modules
     * @protected
     */
    protected _appPath: string;

    /**
     * plugins
     * @protected
     */
    protected _plugins: Plugin[] = [];

    /**
     * constructor
     * @param appPath
     */
    public constructor(appPath?: string) {
        if (appPath) {
            this._appPath = appPath;
        }

        this._appPath = path.join(path.resolve());
    }

    /**
     * scan
     */
    public scan(): PluginInformation[] {
        const nodeModulesPath = path.join(this._appPath, 'node_modules');

        if (!fs.existsSync(nodeModulesPath)) {
            throw new Error(`node_modules directory not found: ${nodeModulesPath}`);
        }

        const modules = fs.readdirSync(nodeModulesPath);
        const informations: PluginInformation[] = [];

        for (const aModule of modules) {
            const packageJsonPath = path.join(nodeModulesPath, aModule);

            if (fs.existsSync(packageJsonPath)) {
                try {
                    const rawdata = readFileSync(path.join(packageJsonPath, 'package.json'), {
                        // @ts-ignore
                        encoding: 'utf-8'
                    });

                    const packetData = JSON.parse(rawdata);

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
     * load
     * @param plugin
     */
    public async load(plugin: PluginInformation): Promise<boolean> {
        try {
            const pluginMain = path.join(plugin.path, plugin.definition.main);

            if (!fs.existsSync(pluginMain)) {
                throw new Error(`plugin main not found: ${pluginMain}`);
            }

            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const oPlugin = require(pluginMain);
            const object = new oPlugin(plugin) as Plugin;

            if (object) {
                Logger.getLogger().info(`PluginManager::load: Plugin is loaded ${plugin.definition.name}`);
                this._plugins.push(object);
            }
        } catch (e) {
            Logger.getLogger().warn(`PluginManager::load: can not load plugin: ${plugin.definition.name}`);
            return false;
        }

        return true;
    }

}