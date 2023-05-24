import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {Delete, SchemaDynDnsClientDelete} from './DynDnsClient/Delete.js';
import {List, SchemaDynDnsClientData} from './DynDnsClient/List.js';
import {Providers} from './DynDnsClient/Providers.js';
import {Save} from './DynDnsClient/Save.js';

/**
 * DynDnsClient
 */
export class DynDnsClient extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/dyndnsclient/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getList());
                }
            }
        );

        this._routes.get(
            '/json/dyndnsclient/provider/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await Providers.getProviders());
                }
            }
        );

        this._routes.post(
            '/json/dyndnsclient/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDynDnsClientData, req.body, res)) {
                        res.status(200).json(await Save.saveClient(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/dyndnsclient/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDynDnsClientDelete, req.body, res)) {
                        res.status(200).json(await Delete.deleteClient(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}