import {Ets} from 'ets';
import {DomainServiceDB, FileHelper, Logger, NginxHttpServiceDB} from 'flyingfish_core';
import {DomainCheckReachability, SchemaDomainCheckReachability} from 'flyingfish_schemas';
import fs from 'fs/promises';
import got from 'got';
import {Job, scheduleJob} from 'node-schedule';
import Path from 'path';
import {v4 as uuid} from 'uuid';
import {SchemaErrors} from 'vts';
import {Certificate} from '../Cert/Certificate.js';
import {NginxServer} from '../Nginx/NginxServer.js';
import {SslCertProviders} from '../Provider/SslCertProvider/SslCertProviders.js';
import {NginxService} from './NginxService.js';

/**
 * SslCertService
 */
export class SslCertService {

    /**
     * Ssl cert service instance
     * @private
     */
    private static _instance: SslCertService|null = null;

    /**
     * getInstance
     */
    public static getInstance(): SslCertService {
        if (SslCertService._instance === null) {
            SslCertService._instance = new SslCertService();
        }

        return SslCertService._instance;
    }

    /**
     * scheduler update job
     * @protected
     */
    protected _schedulerUpdate: Job|null = null;

    /**
     * in process
     * @protected
     */
    protected _inProcess: boolean = false;

    /**
     * _requestDomainCheckReachability
     * @param domain
     * @protected
     */
    protected async _requestDomainCheckReachability(domain: string): Promise<boolean> {
        const wellKnownFf = Path.join(NginxServer.getInstance().getWellKnownPath(), 'flyingfish');

        if (!await FileHelper.directoryExist(wellKnownFf)) {
            Logger.getLogger().silly(`SslCertService::_requestDomainCheckReachability: create wellknown directory by domain: ${domain}`);

            await FileHelper.mkdir(wellKnownFf, true);
        }

        const checkFile = Path.join(wellKnownFf, 'check.json');

        if (await FileHelper.fileExist(checkFile)) {
            Logger.getLogger().silly(`SslCertService::_requestDomainCheckReachability: delete old checkfile: ${checkFile} by domain: ${domain}`);
            await fs.unlink(checkFile);
        }

        const data: DomainCheckReachability = {
            secureKey: uuid(),
            domain: domain
        };

        await fs.writeFile(checkFile, JSON.stringify(data));

        if (!await FileHelper.fileExist(checkFile)) {
            Logger.getLogger().error(`SslCertService::_requestDomainCheckReachability: check file can not create: ${checkFile} by domain: ${domain}`);
            return false;
        }

        const response = await got({
            url: `http://${domain}/.well-known/flyingfish/check.json`,
            responseType: 'json',
            dnsCache: false
        });

        if (await FileHelper.fileExist(checkFile)) {
            Logger.getLogger().silly(`SslCertService::_requestDomainCheckReachability: delete checkfile: ${checkFile} by domain: ${domain}`);
            await fs.unlink(checkFile);
        }

        if (response.body) {
            const errors: SchemaErrors = [];

            if (SchemaDomainCheckReachability.validate(response.body, errors)) {
                if (response.body.domain === data.domain && response.body.secureKey === data.secureKey) {
                    Logger.getLogger().silly('SslCertService::_requestDomainCheckReachability: domain and securekey check result true.');
                    return true;
                }

                Logger.getLogger().error('SslCertService::_requestDomainCheckReachability: Domain check result false!');
            } else {
                Logger.getLogger().error('SslCertService::_requestDomainCheckReachability: Domain check schema is not validate!');
            }
        } else {
            Logger.getLogger().error(
                'SslCertService::_requestDomainCheckReachability: Can not request well-known flyingfish check!'
            );
        }

        return false;
    }

    /**
     * update
     */
    public async update(): Promise<void> {
        this._inProcess = true;

        const https = await NginxHttpServiceDB.getInstance().findAll();

        let reloadNginx = false;

        if (https) {
            for await (const http of https) {
                if (http.ssl_enable) {
                    Logger.getLogger().silly(`SslCertService::update: ssl enable http: ${http.id}`);

                    const domain = await DomainServiceDB.getInstance().findOne(http.domain_id);

                    if (domain) {
                        if (domain.disable) {
                            Logger.getLogger().silly(`SslCertService::update: domain is disable for http: ${http.id}`);
                            continue;
                        }

                        // ---------------------------------------------------------------------------------------------
                        const provider = await SslCertProviders.getProvider(http.cert_provider);

                        if (!provider) {
                            Logger.getLogger().error(`SslCertService::update: provider not found by '${domain.domainname}' domain, http: ${http.id}`);
                            continue;
                        }

                        if (!await provider.isReadyForRequest(
                            http.cert_last_request,
                            http.cert_create_attempts,
                            async() => {
                                Logger.getLogger().info(`SslCertService::update: time over, rest attempts for cert request for domain: ${domain.domainname}`);

                                await NginxHttpServiceDB.getInstance().updateLastCertReq(http.id, 0);
                            }
                        )) {
                            Logger.getLogger().info(`SslCertService::update: too many attempts for cert request, waiting for domain: ${domain.domainname}`);
                            continue;
                        }

                        // ---------------------------------------------------------------------------------------------

                        if (http.cert_email === '') {
                            Logger.getLogger().info(`SslCertService::update: missing email address for domain: ${domain.domainname}`);
                        } else {
                            let isCreateFailed = false;
                            let isCreate = false;

                            if (await provider.existCertificate(domain.domainname)) {
                                const sslBundel = await provider.getCertificationBundel(domain.domainname);

                                if (!sslBundel) {
                                    Logger.getLogger().error(`SslCertService::update: ssl bundel not found by '${domain.domainname}' domain, http: ${http.id}`);
                                    continue;
                                }

                                const cert = new Certificate(sslBundel.certPem);

                                if (cert.isValidate()) {
                                    Logger.getLogger().info(`SslCertService::update: certificate is up to date for domain: ${domain.domainname}`);
                                } else {
                                    // ---------------------------------------------------------------------------------

                                    try {
                                        if (!await this._requestDomainCheckReachability(domain.domainname)) {
                                            Logger.getLogger().error(`SslCertService::update: '${domain.domainname}' domain is not reachability, http: ${http.id}`);
                                            continue;
                                        }
                                    } catch (e) {
                                        Logger.getLogger().error(`SslCertService::update: '${domain.domainname}' (http: ${http.id}), domain check is except: ${Ets.formate(e, true, true)}`);
                                        continue;
                                    }

                                    // ---------------------------------------------------------------------------------

                                    if (await provider.createCertificate({
                                        domainName: domain.domainname,
                                        email: http.cert_email
                                    })) {
                                        Logger.getLogger().info(`SslCertService::update: certificate is renew for domain: ${domain.domainname}`);

                                        isCreate = true;
                                        reloadNginx = true;
                                    } else {
                                        Logger.getLogger().error(`SslCertService::update: certificate is faild to renew for domain: ${domain.domainname}`);

                                        isCreateFailed = true;
                                    }
                                }
                            } else {
                                // -------------------------------------------------------------------------------------

                                try {
                                    if (!await this._requestDomainCheckReachability(domain.domainname)) {
                                        Logger.getLogger().error(`SslCertService::update: '${domain.domainname}' domain is not reachability, http: ${http.id}`);
                                        continue;
                                    }
                                } catch (e) {
                                    Logger.getLogger().error(`SslCertService::update: '${domain.domainname}' (http: ${http.id}), domain check is except: ${Ets.formate(e, true, true)}`);
                                    continue;
                                }

                                // -------------------------------------------------------------------------------------

                                if (await provider.createCertificate({
                                    domainName: domain.domainname,
                                    email: http.cert_email
                                })) {
                                    Logger.getLogger().info(`SslCertService::update: certificate is created for domain: ${domain.domainname}`);

                                    isCreate = true;
                                    reloadNginx = true;
                                } else {
                                    Logger.getLogger().error(`SslCertService::update: certificate is faild to create for domain: ${domain.domainname}`);
                                    isCreateFailed = true;
                                }
                            }

                            // -----------------------------------------------------------------------------------------

                            if (isCreateFailed) {
                                await NginxHttpServiceDB.getInstance().updateLastCertReq(http.id, http.cert_create_attempts + 1);
                            } else if (isCreate) {
                                await NginxHttpServiceDB.getInstance().updateLastCertReq(http.id, 0);
                            }
                        }
                    }
                } else {
                    Logger.getLogger().silly(`SslCertService::update: ssl disable for http: ${http.id}`);
                }
            }
        } else {
            Logger.getLogger().info('SslCertService::update: non https setting found.');
        }

        if (reloadNginx) {
            await NginxService.getInstance().reload();
        }

        this._inProcess = false;
    }

    /**
     * start
     */
    public async start(): Promise<void> {
        this._schedulerUpdate = scheduleJob('*/1 * * * *', async() => {
            if (this._inProcess) {
                return;
            }

            await this.update();
        });
    }

    /**
     * stop
     */
    public async stop(): Promise<void> {
        if (this._schedulerUpdate !== null) {
            this._schedulerUpdate.cancel();
        }
    }

    /**
     * Invoke the update, for example, can call by route save.
     */
    public async invokeUpdate(): Promise<void> {
        if (this._schedulerUpdate !== null) {
            this._schedulerUpdate.invoke();
        }
    }

}