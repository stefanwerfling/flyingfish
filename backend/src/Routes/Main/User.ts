import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    DefaultReturn,
    SchemaDefaultReturn,
    SchemaSessionData,
    SchemaUserDeleteRequest,
    SchemaUserEntry,
    SchemaUserInfoResponse,
    SchemaUserListResponse,
    UserInfoResponse,
    UserListResponse
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
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
    public override getExpressRouter(): Router {
        this._get(
            '/json/user/info',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<UserInfoResponse> => {
                return Info.getUserInfo(data.session!);
            },
            {
                description: 'Read the current user info',
                sessionSchema: SchemaSessionData,
                responseBodySchema: SchemaUserInfoResponse
            }
        );

        this._get(
            '/json/user/list',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<UserListResponse> => {
                return List.getUserList();
            },
            {
                description: 'Read the user list',
                responseBodySchema: SchemaUserListResponse
            }
        );

        this._post(
            '/json/user/save',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Save.saveUser(data.body!);
            },
            {
                description: 'Save a user',
                bodySchema: SchemaUserEntry,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._post(
            '/json/user/delete',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Delete.deleteUser(data.body!);
            },
            {
                description: 'Delete a user',
                bodySchema: SchemaUserDeleteRequest,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}