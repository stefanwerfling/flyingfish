import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {SchemaSslDetailsRequest, SchemaSslListWildcardRequest} from 'flyingfish_schemas';
import {Details} from './Ssl/Details.js';
import {ListWildcard} from './Ssl/ListWildcard.js';
import {Providers} from './Ssl/Providers.js';
import {Run} from './Ssl/Run.js';

/**
 * Certificate
 */
export class Ssl extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._get(
            '/json/ssl/provider/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await Providers.getProviders());
                }
            }
        );

        this._post(
            '/json/ssl/cert/details',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaSslDetailsRequest, req.body, res)) {
                        res.status(200).json(await Details.getCertDetails(req.body));
                    }
                }
            }
        );

        this._get(
            '/json/ssl/run/service',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await Run.rundService());
                }
            }
        );

        this._post(
            '/json/ssl/cert/wildcards',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaSslListWildcardRequest, req.body, res)) {
                        res.status(200).json(await ListWildcard.getAllCertforWildcard(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}