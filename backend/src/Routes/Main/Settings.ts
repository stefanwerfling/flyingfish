import {Router} from 'express';
import {DefaultReturn, DefaultRoute, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {Settings as GlobalSettings} from '../../inc/Settings/Settings.js';

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
 * Settings
 */
export class Settings extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * getList
     */
    public async getList(): Promise<SettingsResponse> {
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

    /**
     * saveSettings
     * @param data
     */
    public async saveSettings(data: SettingsList): Promise<DefaultReturn> {
        await GlobalSettings.setSetting(GlobalSettings.NGINX_WORKER_CONNECTIONS, data.nginx.worker_connections);
        await GlobalSettings.setSetting(GlobalSettings.NGINX_RESOLVER, data.nginx.resolver);

        await GlobalSettings.setSetting(GlobalSettings.BLACKLIST_IMPORTER, data.blacklist.importer);
        await GlobalSettings.setSetting(GlobalSettings.BLACKLIST_IPLOCATE, data.blacklist.iplocate);

        return {
            statusCode: StatusCodes.OK
        };
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/settings/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getList());
                }
            }
        );

        this._routes.post(
            '/json/settings/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaSettingsList, req.body, res)) {
                        res.status(200).json(await this.saveSettings(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}