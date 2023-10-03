import {Request, Response, Router} from 'express';
import {DefaultRoute, DynDnsServerUserServiceDB, Logger} from 'flyingfish_core';
import {SchemaRequestData, SessionData} from 'flyingfish_schemas';
import auth from 'basic-auth';

/**
 * Update
 */
export class Update extends DefaultRoute {

    public static async setNicUpdate(req: Request, session: SessionData, response: Response): Promise<void> {
        if (session.user && session.user.isLogin) {
            let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

            if (req.params.ip) {
                ip = req.params.ip;
                Logger.getLogger().silly(`Update::setNicUpdate: set ip by param, by user: ${session.user.userid}`);
            }

            Logger.getLogger().silly(`Update::setNicUpdate: use ip: ${ip} by user: ${session.user.userid}`);

            if (req.params.hostname) {
                const hostname = req.params.hostname;

                Logger.getLogger().silly(`Update::setNicUpdate: check hostname: ${hostname} by user: ${session.user.userid}`);
            } else {
                Logger.getLogger().silly(`Update::setNicUpdate: update all hostnames, by user: ${session.user.userid}`);
            }
        } else if (session.user) {
            Logger.getLogger().silly(`Update::setNicUpdate: user is not login: ${session.user.userid}`);
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
            async(
                req,
                res
            ) => {
                Logger.getLogger().silly(`Update::nic-update: heders.authorization: ${req.headers.authorization}`);

                const credentials = auth(req);

                let userId: number = 0;
                let granted = false;

                if (credentials) {
                    Logger.getLogger().silly(`Update::nic-update: basic auth - name: ${credentials.name}`);

                    const ddnsUser = await DynDnsServerUserServiceDB.getInstance().findByName(credentials.name);

                    if (ddnsUser) {
                        Logger.getLogger().silly(`Update::nic-update: basic auth - user found by id: ${ddnsUser.id}`);

                        if (ddnsUser.password === credentials.pass) {
                            Logger.getLogger().silly(`Update::nic-update: password accept for user id: ${ddnsUser.id}`);
                            granted = true;
                            userId = ddnsUser.id;
                        }
                    } else {
                        Logger.getLogger().warn(`Update::nic-update: basic auth - user not found - name: ${credentials.name}`);
                    }
                }

                if (granted) {
                    if (this.isSchemaValidate(SchemaRequestData, req, res)) {
                        if (!req.session.user) {
                            req.session.user = {
                                isLogin: false,
                                userid: 0
                            };
                        }

                        req.session.user.userid = userId;
                        req.session.user.isLogin = true;

                        Update.setNicUpdate(req, req.session, res);
                    }
                } else {
                    res.set('WWW-Authenticate', 'Basic realm="401"');
                    res.status(401).send('Authentication required.');
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