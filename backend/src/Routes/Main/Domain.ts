import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {
    SchemaDomainData,
    SchemaDomainDelete,
    SchemaDomainRecordDelete,
    SchemaDomainRecordSave
} from 'flyingfish_schemas';
import {List} from './Domain/List.js';
import {Delete as DomainDelete} from './Domain/Delete.js';
import {Delete as DomainRecordDelete} from './Domain/Record/Delete.js';
import {Save as DomainRecordSave} from './Domain/Record/Save.js';
import {Save as DomainSave} from './Domain/Save.js';

/**
 * Domain
 */
export class Domain extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/domain/list',
            async(
                req,
                res
            ) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getDomains());
                }
            }
        );

        this._routes.post(
            '/json/domain/save',
            async(
                req,
                res
            ) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDomainData, req.body, res)) {
                        res.status(200).json(await DomainSave.saveDomain(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/domain/delete',
            async(
                req,
                res
            ) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDomainDelete, req.body, res)) {
                        res.status(200).json(await DomainDelete.deleteDomain(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/domain/record/save',
            async(
                req,
                res
            ) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDomainRecordSave, req.body, res)) {
                        res.status(200).json(await DomainRecordSave.saveDomainRecord(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/domain/record/delete',
            async(
                req,
                res
            ) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDomainRecordDelete, req.body, res)) {
                        res.status(200).json(await DomainRecordDelete.deleteDomainRecord(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}