import {Request, Response, Router} from 'express';
import basicAuth from 'express-basic-auth';
import {DefaultRoute, DynDnsServerUserService} from 'flyingfish_core';
import {SchemaRequestData, SessionData} from 'flyingfish_schemas';

/**
 * Update
 */
export class Update extends DefaultRoute {

    public static async setNicUpdate(req: Request, session: SessionData, response: Response): Promise<void> {
        if (!session.user) {
            session.user = {
                isLogin: false,
                userid: 0
            };
        }

        // @ts-ignore
        if (req.auth) {
            // @ts-ignore
            const ddnsUser = await DynDnsServerUserService.findByName(req.auth.user);

            if (ddnsUser) {
                if (session.user) {
                    session.user.isLogin = true;
                    session.user.userid = ddnsUser.id;
                }
            }
        }
    }

    /**
     * setUpdate
     * @param req
     * @param response
     */
    public static async setUpdate(req: Request, response: Response): Promise<void> {
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/nic/update',
            basicAuth({
                realm: 'FlyingFish DDNS Server',
                authorizeAsync: true,
                authorizer: async(
                    username,
                    password,
                    callback
                ) => {
                    const ddnsUser = await DynDnsServerUserService.findByName(username);

                    if (ddnsUser) {
                        if (ddnsUser.password === password) {

                            return callback(null, true);
                        }
                    }

                    return callback(null, false);
                }
            }),
            async(
                req,
                res
            ) => {
                if (this.isSchemaValidate(SchemaRequestData, req, res)) {
                    Update.setNicUpdate(req, req.session, res);
                }
            }
        );

        this._routes.get(
            '/update',
            async(
                req,
                res
            ) => {
                Update.setUpdate(req, res);
            }
        );

        return super.getExpressRouter();
    }

}