import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {Delete, SchemaGatewayIdentifierDelete} from './GatewayIdentifier/Delete.js';
import {List, SchemaGatewayIdentifierEntry} from './GatewayIdentifier/List.js';
import {Save} from './GatewayIdentifier/Save.js';

/**
 * GatewayIdentifier
 */
export class GatewayIdentifier extends DefaultRoute {

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
            '/json/gatewayidentifier/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getList());
                }
            }
        );

        this._routes.post(
            '/json/gatewayidentifier/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaGatewayIdentifierEntry, req.body, res)) {
                        res.status(200).json(await Save.save(req.body));
                    }
                }
            }
        );

        this._routes.post(
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