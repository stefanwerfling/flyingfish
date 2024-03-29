import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {IsLogin, SchemaLoginRequest, SchemaRequestData, StatusCodes} from 'flyingfish_schemas';
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
        this._get(
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

        this._post(
            '/json/login',
            async(req, res) => {
                if (this.isSchemaValidate(SchemaRequestData, req, res) && this.isSchemaValidate(SchemaLoginRequest, req.body, res)) {
                    res.status(200).json(await LoginLogin.login(req.session, req.body));
                }
            }
        );

        this._get(
            '/json/logout',
            async(req, res) => {
                if (this.isSchemaValidate(SchemaRequestData, req, res) && this.isUserLogin(req, res)) {
                    res.status(200).json(await Logout.logout(req.session));
                }
            }
        );

        return super.getExpressRouter();
    }

}