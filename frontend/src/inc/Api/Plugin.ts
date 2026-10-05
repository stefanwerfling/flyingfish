import {
    PluginDataSaveRequest,
    PluginEnableRequest,
    PluginListEntry,
    PluginNameRequest,
    PluginUiResponse,
    SchemaDefaultReturn,
    SchemaPluginListResponse,
    SchemaPluginUiResponse
} from 'flyingfish_schemas';
import {Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch.js';
import {UnknownResponse} from './Error/UnknownResponse.js';

/**
 * Plugin — API client for the plugin config-UI endpoints (9.9.x).
 */
export class Plugin {

    /**
     * List all discovered plugins.
     * @returns {PluginListEntry[]}
     */
    public static async getList(): Promise<PluginListEntry[]> {
        const result = await NetFetch.getData('/json/plugin/list', SchemaPluginListResponse);

        if (Vts.isUndefined(result.list)) {
            throw new UnknownResponse('Plugin list is empty!');
        }

        return result.list;
    }

    /**
     * Read a plugin's declarative UI schema and current config values.
     * @param {string} name - Plugin manifest name.
     * @returns {PluginUiResponse}
     */
    public static async getUi(name: string): Promise<PluginUiResponse> {
        const req: PluginNameRequest = {
            name: name
        };

        return NetFetch.postData('/json/plugin/ui', req, SchemaPluginUiResponse);
    }

    /**
     * Save a plugin's config values.
     * @param {string} name - Plugin manifest name.
     * @param {Record<string, unknown>} data - Config values keyed by field key.
     * @returns {boolean}
     */
    public static async saveData(name: string, data: Record<string, unknown>): Promise<boolean> {
        const req: PluginDataSaveRequest = {
            name: name,
            data: data
        };

        await NetFetch.postData('/json/plugin/data/save', req, SchemaDefaultReturn);

        return true;
    }

    /**
     * Enable or disable a plugin.
     * @param {string} name - Plugin manifest name.
     * @param {boolean} enabled
     * @returns {boolean}
     */
    public static async setEnable(name: string, enabled: boolean): Promise<boolean> {
        const req: PluginEnableRequest = {
            name: name,
            enabled: enabled
        };

        await NetFetch.postData('/json/plugin/enable', req, SchemaDefaultReturn);

        return true;
    }

}
