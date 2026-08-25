import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    DefaultReturn,
    SchemaDefaultReturn,
    SchemaSettingsList,
    SchemaSettingsResponse,
    SettingsResponse
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {List} from './Settings/List.js';
import {Save} from './Settings/Save.js';

/**
 * Settings
 */
export class Settings extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/settings/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<SettingsResponse> => {
                return List.getList();
            },
            {
                description: 'Read the settings list',
                responseBodySchema: SchemaSettingsResponse
            }
        );

        this._post(
            '/json/settings/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Save.saveSettings(data.body!);
            },
            {
                description: 'Save the settings list',
                bodySchema: SchemaSettingsList,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}