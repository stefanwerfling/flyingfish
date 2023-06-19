import {Request, Response, Router} from 'express';
import basicAuth from 'express-basic-auth';
import {DefaultRoute, DynDnsServerUserService} from 'flyingfish_core';

/**
 * Update
 */
export class Update extends DefaultRoute {

    public static async setNicUpdate(req: Request, response: Response): Promise<void> {
        if (!req.session.user) {
            req.session.user = {
                isLogin: false,
                userid: 0
            };
        }

        // @ts-ignore
        if (req.auth) {
            // @ts-ignore
            const ddnsUser = await DynDnsServerUserService.findByName(req.auth.user);

            if (ddnsUser) {
                req.session.user.isLogin = true;
                req.session.user.userid = ddnsUser.id;
            }
        }
    }

    /**
     * setUpdate
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
                Update.setNicUpdate(req, res);
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