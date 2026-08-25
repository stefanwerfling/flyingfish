import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    DefaultReturn,
    DynDnsServerListResponse,
    DynDnsServerNotInDomainResponse,
    SchemaDefaultReturn,
    SchemaDynDnsServerData,
    SchemaDynDnsServerListResponse,
    SchemaDynDnsServerNotInDomainResponse
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {Delete} from './DynDnsServer/Delete.js';
import {DomainList} from './DynDnsServer/DomainList.js';
import {List} from './DynDnsServer/List.js';
import {Save} from './DynDnsServer/Save.js';

/**
 * DynDnsServer
 */
export class DynDnsServer extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/dyndnsserver/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<DynDnsServerListResponse> => {
                return List.getList();
            },
            {
                description: 'Read the DynDNS server list',
                responseBodySchema: SchemaDynDnsServerListResponse
            }
        );

        // Intentionally public (no auth): the DynDNS updater queries it unauthenticated.
        this._get(
            '/json/dyndnsserver/domain/list',
            false,
            async(): Promise<DynDnsServerNotInDomainResponse> => {
                return DomainList.getDomains();
            },
            {
                description: 'Read the domains not assigned to a DynDNS server',
                responseBodySchema: SchemaDynDnsServerNotInDomainResponse
            }
        );

        this._post(
            '/json/dyndnsserver/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Save.saveUser(data.body!);
            },
            {
                description: 'Save a DynDNS server',
                bodySchema: SchemaDynDnsServerData,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/dyndnsserver/delete',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Delete.deleteUser(data.body!);
            },
            {
                description: 'Delete a DynDNS server',
                bodySchema: SchemaDynDnsServerData,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}