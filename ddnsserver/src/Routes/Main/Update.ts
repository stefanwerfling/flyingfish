import {Request, Response, Router} from 'express';
import {DefaultRoute, DynDnsServerUserServiceDB, Logger} from 'flyingfish_core';
import {SchemaRequestData, SessionData} from 'flyingfish_schemas';
import auth from 'basic-auth';

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
            const ddnsUser = await DynDnsServerUserServiceDB.findByName(req.auth.user);

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
            async(
                req,
                res
            ) => {
                Logger.getLogger().silly(`Update::nic-update: heders.authorization: ${req.headers.authorization}`);

                const credentials = auth(req);

                let granted = false;

                if (credentials) {
                    Logger.getLogger().silly(`Update::nic-update: basic auth - name: ${credentials.name}`);

                    const ddnsUser = await DynDnsServerUserServiceDB.getInstance().findByName(credentials.name);

                    if (ddnsUser) {
                        Logger.getLogger().silly(`Update::nic-update: basic auth - user found: ${ddnsUser.id}`);

                        if (ddnsUser.password === credentials.pass) {
                            granted = true;
                        }
                    } else {
                        Logger.getLogger().warn(`Update::nic-update: basic auth - user not found - name: ${credentials.name}`);
                    }
                }

                if (granted) {
                    if (this.isSchemaValidate(SchemaRequestData, req, res)) {
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