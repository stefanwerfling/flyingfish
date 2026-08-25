import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {SchemaSshPortListResponse, SshPortListResponse} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {List} from './Ssh/List.js';

/**
 * Ssh
 */
export class Ssh extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/ssh/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<SshPortListResponse> => {
                return List.getList();
            },
            {
                description: 'Read the SSH port list',
                responseBodySchema: SchemaSshPortListResponse
            }
        );

        return super.getExpressRouter();
    }

}