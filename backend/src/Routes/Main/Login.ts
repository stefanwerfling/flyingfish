import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {IsLogin, SchemaLoginRequest, StatusCodes} from 'flyingfish_schemas';
import {Login as LoginLogin} from './Login/Login.js';
import {Logout} from './Login/Logout.js';

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
                    } as IsLogin);
                } else {
                    res.status(200).json({
                        statusCode: StatusCodes.OK,
                        status: false
                    } as IsLogin);
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