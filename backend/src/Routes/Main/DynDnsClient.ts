import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {SchemaDynDnsClientData, SchemaDynDnsClientDelete, SchemaDynDnsClientDomainRunRequest} from 'flyingfish_schemas';
import {Delete} from './DynDnsClient/Delete.js';
import {List} from './DynDnsClient/List.js';
import {Providers} from './DynDnsClient/Providers.js';
import {Run} from './DynDnsClient/Run.js';
import {Save} from './DynDnsClient/Save.js';

/**
 * DynDnsClient
 */
export class DynDnsClient extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._get(
            '/json/dyndnsclient/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getList());
                }
            }
        );

        this._get(
            '/json/dyndnsclient/provider/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await Providers.getProviders());
                }
            }
        );

        this._post(
            '/json/dyndnsclient/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDynDnsClientData, req.body, res)) {
                        res.status(200).json(await Save.saveClient(req.body));
                    }
                }
            }
        );

        this._post(
            '/json/dyndnsclient/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDynDnsClientDelete, req.body, res)) {
                        res.status(200).json(await Delete.deleteClient(req.body));
                    }
                }
            }
        );

        this._get(
            '/json/dyndnsclient/run/service',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await Run.rundService());
                }
            }
        );

        this._post(
            '/json/dyndnsclient/run/client',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDynDnsClientDomainRunRequest, req.body, res)) {
                        res.status(200).json(await Run.runClient(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}