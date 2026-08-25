import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    DefaultReturn,
    GatewayIdentifierListResponse,
    GatewayIdentifierSaveResponse,
    SchemaDefaultReturn,
    SchemaGatewayIdentifierDelete,
    SchemaGatewayIdentifierEntry,
    SchemaGatewayIdentifierListResponse,
    SchemaGatewayIdentifierSaveResponse
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {Delete} from './GatewayIdentifier/Delete.js';
import {List} from './GatewayIdentifier/List.js';
import {Save} from './GatewayIdentifier/Save.js';

/**
 * GatewayIdentifier
 */
export class GatewayIdentifier extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/gatewayidentifier/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<GatewayIdentifierListResponse> => {
                return List.getList();
            },
            {
                description: 'Read the gateway identifier list',
                responseBodySchema: SchemaGatewayIdentifierListResponse
            }
        );

        this._post(
            '/json/gatewayidentifier/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<GatewayIdentifierSaveResponse> => {
                return Save.save(data.body!);
            },
            {
                description: 'Save a gateway identifier',
                bodySchema: SchemaGatewayIdentifierEntry,
                responseBodySchema: SchemaGatewayIdentifierSaveResponse
            }
        );

        this._post(
            '/json/gatewayidentifier/delete',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Delete.delete(data.body!);
            },
            {
                description: 'Delete a gateway identifier',
                bodySchema: SchemaGatewayIdentifierDelete,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}