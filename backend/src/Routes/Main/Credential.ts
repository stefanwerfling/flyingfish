import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {SchemaCredential} from 'flyingfish_schemas';
import {List} from './Credential/List.js';
import {Provider} from './Credential/Provider.js';
import {Save} from './Credential/Save.js';

/**
 * Credential route
 */
export class Credential extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._get(
            '/json/credential/provider/list',
            async(
                req,
                res
            ) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await Provider.getProviders());
                }
            }
        );

        this._get(
            '/json/credential/list',
            async(
                req,
                res
            ) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getCredentials());
                }
            }
        );

        this._post(
            '/json/credential/save',
            async(
                req,
                res
            ) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaCredential, req.body, res)) {
                        res.status(200).json(await Save.saveCredential(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}