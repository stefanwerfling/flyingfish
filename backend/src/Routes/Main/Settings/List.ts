import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {ExtractSchemaResultType, Vts} from 'vts';
import {Settings as GlobalSettings} from '../../../inc/Settings/Settings.js';

/**
 * SettingsList
 */
export const SchemaSettingsList = Vts.object({
    nginx: Vts.object({
        worker_connections: Vts.string(),
        resolver: Vts.string()
    }),
    blacklist: Vts.object({
        importer: Vts.string(),
        iplocate: Vts.string()
    })
});

export type SettingsList = ExtractSchemaResultType<typeof SchemaSettingsList>;

/**
 * SettingsResponse
 */
export type SettingsResponse = DefaultReturn & {
    list?: SettingsList;
};

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