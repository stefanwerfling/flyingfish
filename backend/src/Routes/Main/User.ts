import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {SchemaUserDeleteRequest, SchemaUserEntry} from 'flyingfish_schemas';
import {Delete} from './User/Delete.js';
import {Info} from './User/Info.js';
import {List} from './User/List.js';
import {Save} from './User/Save.js';

/**
 * User
 */
export class User extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/user/info',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await Info.getUserInfo(req));
                }
            }
        );

        this._routes.get(
            '/json/user/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getUserList());
                }
            }
        );

        this._routes.post(
            '/json/user/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaUserEntry, req.body, res)) {
                        res.status(200).json(await Save.saveUser(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/user/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaUserDeleteRequest, req.body, res)) {
                        res.status(200).json(await Delete.deleteUser(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}