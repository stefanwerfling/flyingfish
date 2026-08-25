import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    CredentialProviderResponse,
    CredentialResponse,
    CredentialUsersResponse,
    DefaultReturn,
    SchemaCredential,
    SchemaCredentialProviderResponse,
    SchemaCredentialResponse,
    SchemaCredentialUser,
    SchemaCredentialUsersRequest,
    SchemaCredentialUsersResponse,
    SchemaDefaultReturn
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {List} from './Credential/List.js';
import {Provider} from './Credential/Provider.js';
import {Save} from './Credential/Save.js';
import {List as UserList} from './Credential/User/List.js';
import {Save as UserSave} from './Credential/User/Save.js';

/**
 * Credential route
 */
export class Credential extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/credential/provider/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<CredentialProviderResponse> => {
                return Provider.getProviders();
            },
            {
                description: 'Read the credential provider list',
                responseBodySchema: SchemaCredentialProviderResponse
            }
        );

        this._get(
            '/json/credential/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<CredentialResponse> => {
                return List.getCredentials();
            },
            {
                description: 'Read the credential list',
                responseBodySchema: SchemaCredentialResponse
            }
        );

        this._post(
            '/json/credential/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Save.saveCredential(data.body!);
            },
            {
                description: 'Save a credential',
                bodySchema: SchemaCredential,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/credential/user/list',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<CredentialUsersResponse> => {
                return UserList.getUsers(data.body!);
            },
            {
                description: 'Read the credential user list',
                bodySchema: SchemaCredentialUsersRequest,
                responseBodySchema: SchemaCredentialUsersResponse
            }
        );

        this._post(
            '/json/credential/user/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return UserSave.saveUser(data.body!);
            },
            {
                description: 'Save a credential user',
                bodySchema: SchemaCredentialUser,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}