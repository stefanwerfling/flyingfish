import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    DefaultReturn,
    IsLogin,
    SchemaDefaultReturn,
    SchemaIsLogin,
    SchemaLoginRequest,
    SchemaSessionData,
    StatusCodes
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckUserLogin, isFlyingFishUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {Login as LoginLogin} from './Login/Login.js';
import {Logout} from './Login/Logout.js';

/**
 * Login
 */
export class Login extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        // Public probe: answers 200 either way with the login state in `status`.
        this._get(
            '/json/islogin',
            false,
            async(req): Promise<IsLogin> => {
                return {
                    statusCode: StatusCodes.OK,
                    status: isFlyingFishUserLogin(req)
                };
            },
            {
                description: 'Probe whether the current session is logged in',
                responseBodySchema: SchemaIsLogin
            }
        );

        // Public: the login endpoint itself must be reachable unauthenticated.
        this._post(
            '/json/login',
            false,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return LoginLogin.login(data.session!, data.body!);
            },
            {
                description: 'Log in with username and password',
                bodySchema: SchemaLoginRequest,
                sessionSchema: SchemaSessionData,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        this._get(
            '/json/logout',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Logout.logout(data.session!);
            },
            {
                description: 'Log out the current session',
                sessionSchema: SchemaSessionData,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}