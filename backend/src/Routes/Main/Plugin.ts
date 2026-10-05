import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {
    DefaultReturn,
    PluginListResponse,
    PluginUiResponse,
    SchemaDefaultReturn,
    SchemaPluginDataSaveRequest,
    SchemaPluginEnableRequest,
    SchemaPluginListResponse,
    SchemaPluginNameRequest,
    SchemaPluginUiResponse
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {PluginActions} from './Plugin/PluginActions.js';

/**
 * Plugin route — plugin config-UI (9.9.x): list plugins, read a plugin's
 * declarative UI + values, save values, and enable/disable a plugin.
 */
export class Plugin extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/plugin/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<PluginListResponse> => {
                return PluginActions.getList();
            },
            {
                description: 'List all discovered plugins with enabled/loaded/hasUi state',
                responseBodySchema: SchemaPluginListResponse
            }
        );

        this._post(
            '/json/plugin/ui',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<PluginUiResponse> => {
                return PluginActions.getUi(data.body!);
            },
            {
                description: 'Read a plugin\'s declarative UI schema and current config values',
                bodySchema: SchemaPluginNameRequest,
                responseBodySchema: SchemaPluginUiResponse
            }
        );

        this._post(
            '/json/plugin/data/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return PluginActions.saveData(data.body!);
            },
            {
                description: 'Validate and persist a plugin\'s config values',
                bodySchema: SchemaPluginDataSaveRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/plugin/enable',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return PluginActions.setEnable(data.body!);
            },
            {
                description: 'Enable or disable a plugin',
                bodySchema: SchemaPluginEnableRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}
