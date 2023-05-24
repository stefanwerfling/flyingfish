import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {Delete, SchemaListenDelete} from './Listen/Delete.js';
import {List, SchemaListenData} from './Listen/List.js';
import {Save} from './Listen/Save.js';

/**
 * Listen
 */
export class Listen extends DefaultRoute {

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
            '/json/listen/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getListens());
                }
            }
        );

        this._routes.post(
            '/json/listen/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaListenData, req.body, res)) {
                        res.status(200).json(await Save.saveListen(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/listen/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaListenDelete, req.body, res)) {
                        res.status(200).json(await Delete.deleteListen(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}