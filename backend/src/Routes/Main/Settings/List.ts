import {SettingsList, SettingsResponse, StatusCodes} from 'flyingfish_schemas';
import {Settings as GlobalSettings} from '../../../inc/Settings/Settings.js';

/**
 * List
 */
export class List {

    /**
     * getList
     */
    public static async getList(): Promise<SettingsResponse> {
        const setting: SettingsList = {
            // nginx ---------------------------------------------------------------------------------------------------
            nginx: {
                worker_connections: await GlobalSettings.getSetting(
                    GlobalSettings.NGINX_WORKER_CONNECTIONS,
                    GlobalSettings.NGINX_WORKER_CONNECTIONS_DEFAULT
                ),
                resolver: await GlobalSettings.getSetting(
                    GlobalSettings.NGINX_RESOLVER,
                    GlobalSettings.NGINX_RESOLVER_DEFAULT
                )
            },
            // blacklist -----------------------------------------------------------------------------------------------
            blacklist: {
                importer: await GlobalSettings.getSetting(
                    GlobalSettings.BLACKLIST_IMPORTER,
                    GlobalSettings.BLACKLIST_IMPORTER_DEFAULT
                ),
                iplocate: await GlobalSettings.getSetting(
                    GlobalSettings.BLACKLIST_IPLOCATE,
                    GlobalSettings.BLACKLIST_IPLOCATE_DEFAULT
                )
            }
        };

        return {
            statusCode: StatusCodes.OK,
            list: setting
        };
    }

}