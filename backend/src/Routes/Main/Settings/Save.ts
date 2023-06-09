import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {SettingsList} from './List.js';
import {Settings as GlobalSettings} from '../../../inc/Settings/Settings.js';

/**
 * Save
 */
export class Save {

    /**
     * saveSettings
     * @param data
     */
    public static async saveSettings(data: SettingsList): Promise<DefaultReturn> {
        await GlobalSettings.setSetting(GlobalSettings.NGINX_WORKER_CONNECTIONS, data.nginx.worker_connections);
        await GlobalSettings.setSetting(GlobalSettings.NGINX_RESOLVER, data.nginx.resolver);

        await GlobalSettings.setSetting(GlobalSettings.BLACKLIST_IMPORTER, data.blacklist.importer);
        await GlobalSettings.setSetting(GlobalSettings.BLACKLIST_IPLOCATE, data.blacklist.iplocate);

        return {
            statusCode: StatusCodes.OK
        };
    }

}