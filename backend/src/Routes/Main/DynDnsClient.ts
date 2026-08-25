import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    DefaultReturn,
    DynDnsClientListResponse,
    DynDnsClientProviderListResponse,
    SchemaDefaultReturn,
    SchemaDynDnsClientData,
    SchemaDynDnsClientDelete,
    SchemaDynDnsClientDomainRunRequest,
    SchemaDynDnsClientListResponse,
    SchemaDynDnsClientProviderListResponse
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {Delete} from './DynDnsClient/Delete.js';
import {List} from './DynDnsClient/List.js';
import {Providers} from './DynDnsClient/Providers.js';
import {Run} from './DynDnsClient/Run.js';
import {Save} from './DynDnsClient/Save.js';

/**
 * DynDnsClient
 */
export class DynDnsClient extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/dyndnsclient/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<DynDnsClientListResponse> => {
                return List.getList();
            },
            {
                description: 'Read the DynDNS client list',
                responseBodySchema: SchemaDynDnsClientListResponse
            }
        );

        this._get(
            '/json/dyndnsclient/provider/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<DynDnsClientProviderListResponse> => {
                return Providers.getProviders();
            },
            {
                description: 'Read the DynDNS client provider list',
                responseBodySchema: SchemaDynDnsClientProviderListResponse
            }
        );

        this._post(
            '/json/dyndnsclient/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Save.saveClient(data.body!);
            },
            {
                description: 'Save a DynDNS client',
                bodySchema: SchemaDynDnsClientData,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/dyndnsclient/delete',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Delete.deleteClient(data.body!);
            },
            {
                description: 'Delete a DynDNS client',
                bodySchema: SchemaDynDnsClientDelete,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._get(
            '/json/dyndnsclient/run/service',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<DefaultReturn> => {
                return Run.rundService();
            },
            {
                description: 'Run the DynDNS client service',
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/dyndnsclient/run/client',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Run.runClient(data.body!);
            },
            {
                description: 'Run a single DynDNS client',
                bodySchema: SchemaDynDnsClientDomainRunRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}