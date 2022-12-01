import {Body, Get, JsonController, Post, Session} from 'routing-controllers-extended';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';
import {Settings as GlobalSettings} from '../../inc/Settings/Settings.js';

/**
 * SettingsList
 */
export type SettingsList = {
    nginx: {
        worker_connections: string;
        resolver: string;
    };
    blacklist: {
        importer: string;
        iplocate: string;
    };
};

/**
 * SettingsResponse
 */
export type SettingsResponse = DefaultReturn & {
    list?: SettingsList;
};

/**
 * Settings
 */
@JsonController()
export class Settings {

    /**
     * getList
     * @param session
     */
    @Get('/json/settings/list')
    public async getList(@Session() session: any): Promise<SettingsResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const setting: SettingsList = {
                // nginx -----------------------------------------------------------------------------------------------
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

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * saveSettings
     * @param session
     * @param request
     */
    @Post('/json/settings/save')
    public async saveSettings(@Session() session: any, @Body() request: SettingsList): Promise<boolean> {
        if ((session.user !== undefined) && session.user.isLogin) {
            await GlobalSettings.setSetting(GlobalSettings.NGINX_WORKER_CONNECTIONS, request.nginx.worker_connections);
            await GlobalSettings.setSetting(GlobalSettings.NGINX_RESOLVER, request.nginx.resolver);

            await GlobalSettings.setSetting(GlobalSettings.BLACKLIST_IMPORTER, request.blacklist.importer);
            await GlobalSettings.setSetting(GlobalSettings.BLACKLIST_IPLOCATE, request.blacklist.iplocate);

            return true;
        }

        return false;
    }

}