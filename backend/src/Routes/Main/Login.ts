import * as bcrypt from 'bcrypt';
import {Request, Router} from 'express';
import {DefaultReturn, DefaultRoute, Logger, SessionUserData, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../inc/Db/MariaDb/DBHelper.js';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User.js';

/**
 * LoginRequest
 */
export const SchemaLoginRequest = Vts.object({
    email: Vts.string(),
    password: Vts.string()
});

export type LoginRequest = ExtractSchemaResultType<typeof SchemaLoginRequest>;

/**
 * LoginResponse
 */
export type LoginResponse = DefaultReturn;

/**
 * LoginIsLoginResponse
 */
export type LoginIsLoginResponse = DefaultReturn & {
    status: boolean;
};

/**
 * LoginLogoutResponse
 */
export type LoginLogoutResponse = DefaultReturn;

/**
 * Login
 */
export class Login extends DefaultRoute {

    /**
     * login
     * @param req
     * @param login
     */
    public async login(req: Request, login: LoginRequest): Promise<LoginResponse> {
        const userRepository = DBHelper.getDataSource().getRepository(UserDB);

        const user = await userRepository.findOne({
            where: {
                email: login.email
            }
        });

        // @ts-ignore
        req.session.user = {
            isLogin: false,
            userid: 0
        } as SessionUserData;

        if (user) {
            const bresult = await bcrypt.compare(login.password, user.password);

            if (bresult) {
                // @ts-ignore
                req.session.user.userid = user.id;
                // @ts-ignore
                req.session.user.isLogin = true;

                Logger.getLogger().info(`Login success by session: ${req.session.id}`);

                return {
                    statusCode: StatusCodes.OK
                };
            }

            Logger.getLogger().warn(`Login faild: wrong password by email: ${login.email}`);

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Wrong password!'
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: 'User not found.'
        };
    }

    /**
     * logout
     * @param req
     */
    public async logout(req: Request): Promise<LoginLogoutResponse> {
        // @ts-ignore
        req.session.user.userid = 0;
        // @ts-ignore
        req.session.user.isLogin = false;

        Logger.getLogger().info(`Logout success by session: ${req.session.id}`);

        return {
            statusCode: StatusCodes.OK
        };
    }

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
                    res.status(200).json(await this.login(req, req.body));
                }
            }
        );

        this._routes.get(
            '/json/logout',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.logout(req));
                }
            }
        );

        return super.getExpressRouter();
    }

}