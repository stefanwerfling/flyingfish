import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {SchemaListenData, SchemaListenDelete} from 'flyingfish_schemas';
import {Delete} from './Listen/Delete.js';
import {List} from './Listen/List.js';
import {Save} from './Listen/Save.js';

/**
 * Listen
 */
export class Listen extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._get(
            '/json/listen/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getListens());
                }
            }
        );

        this._post(
            '/json/listen/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaListenData, req.body, res)) {
                        res.status(200).json(await Save.saveListen(req.body));
                    }
                }
            }
        );

        this._post(
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