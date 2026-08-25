import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    IpAccessBlackDeleteResponse,
    IpAccessBlackListImportSaveResponse,
    IpAccessBlackListImportsResponse,
    IpAccessBlackListOwnSaveResponse,
    IpAccessBlackListOwnsResponse,
    IpAccessMaintainerResponse,
    IpAccessWhiteDeleteResponse,
    IpAccessWhiteListResponse,
    IpAccessWhiteSaveResponse,
    SchemaIpAccessBlackDeleteRequest,
    SchemaIpAccessBlackDeleteResponse,
    SchemaIpAccessBlackListImportSaveRequest,
    SchemaIpAccessBlackListImportSaveResponse,
    SchemaIpAccessBlackListImportsResponse,
    SchemaIpAccessBlackListOwnSaveRequest,
    SchemaIpAccessBlackListOwnSaveResponse,
    SchemaIpAccessBlackListOwnsResponse,
    SchemaIpAccessMaintainerResponse,
    SchemaIpAccessWhiteDeleteRequest,
    SchemaIpAccessWhiteDeleteResponse,
    SchemaIpAccessWhiteListResponse,
    SchemaIpAccessWhiteSaveRequest,
    SchemaIpAccessWhiteSaveResponse
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
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
    public override getExpressRouter(): Router {
        this._get(
            '/json/ipaccess/maintainer/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<IpAccessMaintainerResponse> => {
                return ListMantainer.getMaintainerList();
            },
            {
                description: 'Read the IP blacklist maintainer list',
                responseBodySchema: SchemaIpAccessMaintainerResponse
            }
        );

        this._get(
            '/json/ipaccess/blacklist/imports',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<IpAccessBlackListImportsResponse> => {
                return ListBlacklistImport.getBlackListImports();
            },
            {
                description: 'Read the imported blacklist entries',
                responseBodySchema: SchemaIpAccessBlackListImportsResponse
            }
        );

        this._post(
            '/json/ipaccess/blacklist/import/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<IpAccessBlackListImportSaveResponse> => {
                return SaveBlacklistImport.saveBlackListImport(data.body!);
            },
            {
                description: 'Save an imported blacklist entry',
                bodySchema: SchemaIpAccessBlackListImportSaveRequest,
                responseBodySchema: SchemaIpAccessBlackListImportSaveResponse
            }
        );

        this._get(
            '/json/ipaccess/blacklist/owns',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<IpAccessBlackListOwnsResponse> => {
                return ListBlacklistOwn.getBlackListOwns();
            },
            {
                description: 'Read the own blacklist entries',
                responseBodySchema: SchemaIpAccessBlackListOwnsResponse
            }
        );

        this._post(
            '/json/ipaccess/blacklist/own/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<IpAccessBlackListOwnSaveResponse> => {
                return SaveBlacklistOwn.saveBlackListOwn(data.body!);
            },
            {
                description: 'Save an own blacklist entry',
                bodySchema: SchemaIpAccessBlackListOwnSaveRequest,
                responseBodySchema: SchemaIpAccessBlackListOwnSaveResponse
            }
        );

        this._post(
            '/json/ipaccess/blacklist/delete',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<IpAccessBlackDeleteResponse> => {
                return DeleteBlackListOwn.deleteBlacklist(data.body!);
            },
            {
                description: 'Delete a blacklist entry',
                bodySchema: SchemaIpAccessBlackDeleteRequest,
                responseBodySchema: SchemaIpAccessBlackDeleteResponse
            }
        );

        this._get(
            '/json/ipaccess/whitelist',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<IpAccessWhiteListResponse> => {
                return ListWhitelist.getWhiteList();
            },
            {
                description: 'Read the whitelist entries',
                responseBodySchema: SchemaIpAccessWhiteListResponse
            }
        );

        this._post(
            '/json/ipaccess/whitelist/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<IpAccessWhiteSaveResponse> => {
                return SaveWhitelist.saveWhiteList(data.body!);
            },
            {
                description: 'Save a whitelist entry',
                bodySchema: SchemaIpAccessWhiteSaveRequest,
                responseBodySchema: SchemaIpAccessWhiteSaveResponse
            }
        );

        this._post(
            '/json/ipaccess/whitelist/delete',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<IpAccessWhiteDeleteResponse> => {
                return DeleteWhitelist.deleteWhitelist(data.body!);
            },
            {
                description: 'Delete a whitelist entry',
                bodySchema: SchemaIpAccessWhiteDeleteRequest,
                responseBodySchema: SchemaIpAccessWhiteDeleteResponse
            }
        );

        return super.getExpressRouter();
    }

}