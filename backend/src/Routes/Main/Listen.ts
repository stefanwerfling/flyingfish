import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    DefaultReturn,
    ListenResponse,
    SchemaDefaultReturn,
    SchemaListenData,
    SchemaListenDelete,
    SchemaListenResponse
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {Delete} from './Listen/Delete.js';
import {List} from './Listen/List.js';
import {Save} from './Listen/Save.js';

/**
 * Listen
 */
export class Listen extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/listen/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<ListenResponse> => {
                return List.getListens();
            },
            {
                description: 'Read the listen list',
                responseBodySchema: SchemaListenResponse
            }
        );

        this._post(
            '/json/listen/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Save.saveListen(data.body!);
            },
            {
                description: 'Save a listen',
                bodySchema: SchemaListenData,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/listen/delete',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Delete.deleteListen(data.body!);
            },
            {
                description: 'Delete a listen',
                bodySchema: SchemaListenDelete,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}