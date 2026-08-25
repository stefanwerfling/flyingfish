import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    DefaultReturn,
    SchemaDefaultReturn,
    SchemaSslDetailsRequest,
    SchemaSslDetailsResponse,
    SchemaSslListWildcardRequest,
    SchemaSslListWildcardResponse,
    SchemaSslProvidersResponse,
    SslDetailsResponse,
    SslListWildcardResponse,
    SslProvidersResponse
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {Details} from './Ssl/Details.js';
import {ListWildcard} from './Ssl/ListWildcard.js';
import {Providers} from './Ssl/Providers.js';
import {Run} from './Ssl/Run.js';

/**
 * Certificate
 */
export class Ssl extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/ssl/provider/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<SslProvidersResponse> => {
                return Providers.getProviders();
            },
            {
                description: 'Read the SSL provider list',
                responseBodySchema: SchemaSslProvidersResponse
            }
        );

        this._post(
            '/json/ssl/cert/details',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<SslDetailsResponse> => {
                return Details.getCertDetails(data.body!);
            },
            {
                description: 'Read certificate details',
                bodySchema: SchemaSslDetailsRequest,
                responseBodySchema: SchemaSslDetailsResponse
            }
        );

        this._get(
            '/json/ssl/run/service',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<DefaultReturn> => {
                return Run.rundService();
            },
            {
                description: 'Run the SSL certificate service',
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/ssl/cert/wildcards',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<SslListWildcardResponse> => {
                return ListWildcard.getAllCertforWildcard(data.body!);
            },
            {
                description: 'Read all certificates usable for a wildcard',
                bodySchema: SchemaSslListWildcardRequest,
                responseBodySchema: SchemaSslListWildcardResponse
            }
        );

        return super.getExpressRouter();
    }

}