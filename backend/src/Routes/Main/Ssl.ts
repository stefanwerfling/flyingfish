import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {SchemaSslDetailsRequest} from 'flyingfish_schemas';
import {Details} from './Ssl/Details.js';
import {Providers} from './Ssl/Providers.js';

/**
 * Certificate
 */
export class Ssl extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/ssl/provider/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await Providers.getProviders());
                }
            }
        );

        this._routes.post(
            '/json/ssl/cert/details',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaSslDetailsRequest, req.body, res)) {
                        res.status(200).json(await Details.getCertDetails(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}