import * as bcrypt from 'bcrypt';
import {Request, Response, Router} from 'express';
import {
    DateHelper,
    DefaultRoute,
    DomainDB, DomainRecordServiceDB,
    DomainServiceDB,
    DynDnsServerDomainServiceDB,
    DynDnsServerUserServiceDB, IPHelper,
    Logger
} from 'flyingfish_core';
import {SchemaRequestData, SessionData} from 'flyingfish_schemas';
import auth from 'basic-auth';

/**
 * Update
 */
export class Update extends DefaultRoute {

    public static TYPE_A = 1;
    public static TYPE_AAAA = 28;

    public static async setNicUpdate(req: Request, session: SessionData, response: Response): Promise<void> {
        if (session.user && session.user.isLogin) {
            const iIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

            let ips: string[] = [];

            if (req.params.ip) {
                ips = req.params.ip.split(',');
                Logger.getLogger().silly(`Update::setNicUpdate: set ip by param, by user: ${session.user.userid}`);
            } else if (iIp) {
                if (typeof iIp === 'string') {
                    ips.push(iIp);
                } else {
                    ips.push(...iIp);
                }
            }

            if (ips.length > 0) {
                Logger.getLogger().silly(`Update::setNicUpdate: use ip: ${ips.join(', ')} by user: ${session.user.userid}`);
            } else {
                response.status(500).send('IP could not be determined');
                return;
            }

            // ---------------------------------------------------------------------------------------------------------

            const dynDomains = await DynDnsServerDomainServiceDB.getInstance().findByUser(session.user.userid);
            const domains: DomainDB[] = [];

            for (const dynDomain of dynDomains) {
                const domain = await DomainServiceDB.getInstance().findOne(dynDomain.domain_id);

                if (domain) {
                    domains.push(domain);
                }
            }

            // ---------------------------------------------------------------------------------------------------------

            let hostnames: string[] = [];

            if (req.params.hostname) {
                hostnames = req.params.hostname.split(',');

                Logger.getLogger().silly(`Update::setNicUpdate: check hostname: ${dynDomains.join(',')} by user: ${session.user.userid}`);
            } else {
                Logger.getLogger().silly(`Update::setNicUpdate: update all hostnames, by user: ${session.user.userid}`);
            }

            const domainUpdates: DomainDB[] = [];

            if (hostnames.length > 0) {
                for (const domain of domains) {
                    if (hostnames.indexOf(domain.domainname) > -1) {
                        domainUpdates.push(domain);
                    }
                }
            } else {
                domainUpdates.push(...domains);
            }

            // ---------------------------------------------------------------------------------------------------------

            for (const domain of domainUpdates) {
                const records = await DomainRecordServiceDB.getInstance().findAllByDomain(domain.id);

                for (const record of records) {
                    if (record.dtype === Update.TYPE_A) {
                        for (const ip of ips) {
                            if (IPHelper.isIPv4(ip) && (record.dvalue !== ip)) {
                                record.dvalue = ip;
                                record.last_update = DateHelper.getCurrentDbTime();

                                await DomainRecordServiceDB.getInstance().save(record);
                            }
                        }
                    } else if (record.dtype === Update.TYPE_AAAA) {
                        for (const ip of ips) {
                            if (IPHelper.isIPv6(ip) && (record.dvalue !== ip)) {
                                record.dvalue = ip;
                                record.last_update = DateHelper.getCurrentDbTime();

                                await DomainRecordServiceDB.getInstance().save(record);
                            }
                        }
                    }
                }
            }

            await DynDnsServerUserServiceDB.getInstance().setLastUpdate(session.user.userid);

            response.status(200).send('OK');
            return;
        } else if (session.user) {
            Logger.getLogger().silly(`Update::setNicUpdate: user is not login: ${session.user.userid}`);
        }

        response.status(401).send('Authentication required.');
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

                        const bresult = await bcrypt.compare(credentials.pass, ddnsUser.password);

                        if (bresult) {
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
                        const sessionData = req.session as SessionData;

                        if (!sessionData.user) {
                            sessionData.user = {
                                isLogin: false,
                                userid: 0
                            };
                        }

                        sessionData.user.userid = userId;
                        sessionData.user.isLogin = true;

                        await Update.setNicUpdate(req, req.session, res);
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