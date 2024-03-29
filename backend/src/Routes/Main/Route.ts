import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {
    SchemaRouteHttpDelete,
    SchemaRouteHttpSave,
    SchemaRouteStreamDelete,
    SchemaRouteStreamSave
} from 'flyingfish_schemas';
import {Delete as DeleteHttp} from './Route/Http/Delete.js';
import {Delete as DeleteStream} from './Route/Stream/Delete.js';
import {List} from './Route/List.js';
import {Save as SaveHttp} from './Route/Http/Save.js';
import {Save as SaveStream} from './Route/Stream/Save.js';

/**
 * Route
 */
export class Route extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._get(
            '/json/route/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getRoutes());
                }
            }
        );

        this._post(
            '/json/route/stream/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaRouteStreamSave, req.body, res)) {
                        res.status(200).json(await SaveStream.saveStreamRoute(req.body));
                    }
                }
            }
        );

        this._post(
            '/json/route/stream/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaRouteStreamDelete, req.body, res)) {
                        res.status(200).json(await DeleteStream.deleteStreamRoute(req.body));
                    }
                }
            }
        );

        this._post(
            '/json/route/http/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaRouteHttpSave, req.body, res)) {
                        res.status(200).json(await SaveHttp.saveHttpRoute(req.body));
                    }
                }
            }
        );

        this._post(
            '/json/route/http/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaRouteHttpDelete, req.body, res)) {
                        res.status(200).json(await DeleteHttp.deleteHttpRoute(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}