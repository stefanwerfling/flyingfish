import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    DefaultReturn,
    RoutesResponse,
    SchemaDefaultReturn,
    SchemaRouteHttpDelete,
    SchemaRouteHttpSave,
    SchemaRouteStreamDelete,
    SchemaRouteStreamSave,
    SchemaRoutesResponse
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {Delete as DeleteHttp} from './Route/Http/Delete.js';
import {Delete as DeleteStream} from './Route/Stream/Delete.js';
import {List} from './Route/List.js';
import {Save as SaveHttp} from './Route/Http/Save.js';
import {Save as SaveStream} from './Route/Stream/Save.js';

/**
 * Route
 */
export class Route extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/route/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<RoutesResponse> => {
                return List.getRoutes();
            },
            {
                description: 'Read the route list',
                responseBodySchema: SchemaRoutesResponse
            }
        );

        this._post(
            '/json/route/stream/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return SaveStream.saveStreamRoute(data.body!);
            },
            {
                description: 'Save a stream route',
                bodySchema: SchemaRouteStreamSave,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/route/stream/delete',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return DeleteStream.deleteStreamRoute(data.body!);
            },
            {
                description: 'Delete a stream route',
                bodySchema: SchemaRouteStreamDelete,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/route/http/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return SaveHttp.saveHttpRoute(data.body!);
            },
            {
                description: 'Save an HTTP route',
                bodySchema: SchemaRouteHttpSave,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/route/http/delete',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return DeleteHttp.deleteHttpRoute(data.body!);
            },
            {
                description: 'Delete an HTTP route',
                bodySchema: SchemaRouteHttpDelete,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}