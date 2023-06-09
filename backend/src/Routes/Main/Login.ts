import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {Login as LoginLogin, SchemaLoginRequest} from './Login/Login.js';
import {Logout} from './Login/Logout.js';

/**
 * LoginIsLoginResponse
 */
export type LoginIsLoginResponse = DefaultReturn & {
    status: boolean;
};

/**
 * Login
 */
export class Login extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/islogin',
            async(req, res) => {
                if (this.isUserLogin(req, res, false)) {
                    res.status(200).json({
                        statusCode: StatusCodes.OK,
                        status: true
                    } as LoginIsLoginResponse);
                } else {
                    res.status(200).json({
                        statusCode: StatusCodes.OK,
                        status: false
                    } as LoginIsLoginResponse);
                }
            }
        );

        this._routes.post(
            '/json/login',
            async(req, res) => {
                if (this.isSchemaValidate(SchemaLoginRequest, req.body, res)) {
                    res.status(200).json(await LoginLogin.login(req, req.body));
                }
            }
        );

        this._routes.get(
            '/json/logout',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await Logout.logout(req));
                }
            }
        );

        return super.getExpressRouter();
    }

}