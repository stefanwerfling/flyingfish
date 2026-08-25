import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {DefaultReturn, SchemaDefaultReturn} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {Reload} from './Nginx/Reload.js';

/**
 * Nginx
 */
export class Nginx extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/nginx/reload',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<DefaultReturn> => {
                return Reload.reload();
            },
            {
                description: 'Reload the nginx service',
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}