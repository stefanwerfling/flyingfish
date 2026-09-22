import {SchemaDefaultReturn, SchemaSystemConfigResponse, SystemConfigEntry, SystemConfigSaveRequest} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch.js';

/**
 * System — client for the node's operating mode + target settings (Attach/Router epic).
 */
export class System {

    /**
     * Read the node's system config (mode + targets).
     */
    public static async getConfig(): Promise<SystemConfigEntry> {
        const result = await NetFetch.getData('/json/system/config', SchemaSystemConfigResponse);
        return result.config;
    }

    /**
     * Save the node's system config.
     * @param request - the config to save
     */
    public static async saveConfig(request: SystemConfigSaveRequest): Promise<boolean> {
        await NetFetch.postData('/json/system/config/save', request, SchemaDefaultReturn);
        return true;
    }

}
