import {DefaultRoute} from 'flyingfish_core';
import {Router} from 'express';
import {SchemaDynDnsServerData} from 'flyingfish_schemas';
import {List} from './DynDnsServer/List.js';
import {Save} from './DynDnsServer/Save.js';

/**
 * DynDnsServer
 */
export class DynDnsServer extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._get(
            '/json/dyndnsserver/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getList());
                }
            }
        );

        this._post(
            '/json/dyndnsclient/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDynDnsServerData, req.body, res)) {
                        res.status(200).json(await Save.saveUser(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}