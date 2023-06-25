import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {SchemaGatewayIdentifierDelete, SchemaGatewayIdentifierEntry} from 'flyingfish_schemas';
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
    public getExpressRouter(): Router {
        this._get(
            '/json/gatewayidentifier/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getList());
                }
            }
        );

        this._post(
            '/json/gatewayidentifier/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaGatewayIdentifierEntry, req.body, res)) {
                        res.status(200).json(await Save.save(req.body));
                    }
                }
            }
        );

        this._post(
            '/json/gatewayidentifier/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaGatewayIdentifierDelete, req.body, res)) {
                        res.status(200).json(await Delete.delete(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}