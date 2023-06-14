import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {
    SchemaIpAccessBlackDeleteRequest,
    SchemaIpAccessBlackListImportSaveRequest,
    SchemaIpAccessBlackListOwnSaveRequest, SchemaIpAccessWhiteDeleteRequest, SchemaIpAccessWhiteSaveRequest
} from 'flyingfish_schemas';
import {List as ListBlacklistImport} from './IpAccess/Blacklist/Import/List.js';
import {Save as SaveBlacklistImport} from './IpAccess/Blacklist/Import/Save.js';
import {Delete as DeleteBlackListOwn} from './IpAccess/Blacklist/Own/Delete.js';
import {List as ListBlacklistOwn} from './IpAccess/Blacklist/Own/List.js';
import {Save as SaveBlacklistOwn} from './IpAccess/Blacklist/Own/Save.js';
import {List as ListMantainer} from './IpAccess/Maintainer/List.js';
import {Delete as DeleteWhitelist} from './IpAccess/Whitelist/Delete.js';
import {List as ListWhitelist} from './IpAccess/Whitelist/List.js';
import {Save as SaveWhitelist} from './IpAccess/Whitelist/Save.js';

/**
 * IpAccess
 */
export class IpAccess extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/ipaccess/maintainer/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await ListMantainer.getMaintainerList());
                }
            }
        );

        this._routes.get(
            '/json/ipaccess/blacklist/imports',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await ListBlacklistImport.getBlackListImports());
                }
            }
        );

        this._routes.post(
            '/json/ipaccess/blacklist/import/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaIpAccessBlackListImportSaveRequest, req.body, res)) {
                        res.status(200).json(await SaveBlacklistImport.saveBlackListImport(req.body));
                    }
                }
            }
        );

        this._routes.get(
            '/json/ipaccess/blacklist/owns',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await ListBlacklistOwn.getBlackListOwns());
                }
            }
        );

        this._routes.post(
            '/json/ipaccess/blacklist/own/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaIpAccessBlackListOwnSaveRequest, req.body, res)) {
                        res.status(200).json(await SaveBlacklistOwn.saveBlackListOwn(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/ipaccess/blacklist/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaIpAccessBlackDeleteRequest, req.body, res)) {
                        res.status(200).json(await DeleteBlackListOwn.deleteBlacklist(req.body));
                    }
                }
            }
        );

        this._routes.get(
            '/json/ipaccess/whitelist',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await ListWhitelist.getWhiteList());
                }
            }
        );

        this._routes.post(
            '/json/ipaccess/whitelist/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaIpAccessWhiteSaveRequest, req.body, res)) {
                        res.status(200).json(await SaveWhitelist.saveWhiteList(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/ipaccess/whitelist/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaIpAccessWhiteDeleteRequest, req.body, res)) {
                        res.status(200).json(await DeleteWhitelist.deleteWhitelist(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}