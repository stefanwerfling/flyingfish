import {Ets} from 'ets';
import {DomainServiceDB, FileHelper, Logger, NginxHttpDB, NginxHttpServiceDB} from 'flyingfish_core';
import {DomainCheckReachability, SchemaDomainCheckReachability} from 'flyingfish_schemas';
import fs from 'fs/promises';
import got from 'got';
import {Job, scheduleJob} from 'node-schedule';
import Path from 'path';
import {v4 as uuid} from 'uuid';
import {SchemaErrors, Vts} from 'vts';
import {Certificate} from '../inc/Cert/Certificate.js';
import {Dns2Server} from '../inc/Dns/Dns2Server.js';
import {NginxServer} from '../inc/Nginx/NginxServer.js';
import {SslCertProviders} from '../inc/Provider/SslCertProvider/SslCertProviders.js';
import {NginxService} from './NginxService.js';

/**
 * SSL certificate serverice object
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
     * Check is a domain rechability
     * @param {string} domain
     * @protected
     * @returns {boolean}
     */
    protected async _requestDomainCheckReachability(domain: string): Promise<boolean> {
        const wellKnownFf = Path.join(NginxServer.getInstance().getWellKnownPath(), 'flyingfish');

        if (!await FileHelper.directoryExist(wellKnownFf)) {
            Logger.getLogger().silly(
                'Create wellknown directory by domain: %s',
                domain,
                {
                    class: 'SslCertService::_requestDomainCheckReachability'
                }
            );

            await FileHelper.mkdir(wellKnownFf, true);
        }

        const checkFile = Path.join(wellKnownFf, 'check.json');

        if (await FileHelper.fileExist(checkFile)) {
            Logger.getLogger().silly(
                'Delete old checkfile: %s by domain: %s',
                checkFile,
                domain,
                {
                    class: 'SslCertService::_requestDomainCheckReachability'
                }
            );

            await fs.unlink(checkFile);
        }

        const data: DomainCheckReachability = {
            secureKey: uuid(),
            domain: domain
        };

        await fs.writeFile(checkFile, JSON.stringify(data));

        if (!await FileHelper.fileExist(checkFile)) {
            Logger.getLogger().error(
                'Check file can not create: %s by domain: %s',
                checkFile,
                domain,
                {
                    class: 'SslCertService::_requestDomainCheckReachability'
                }
            );

            return false;
        }

        const response = await got({
            url: `http://${domain}/.well-known/flyingfish/check.json`,
            responseType: 'json',
            dnsCache: false
        });

        if (await FileHelper.fileExist(checkFile)) {
            Logger.getLogger().silly(
                'Delete checkfile: %s by domain: %s',
                checkFile,
                domain,
                {
                    class: 'SslCertService::_requestDomainCheckReachability'
                }
            );

            await fs.unlink(checkFile);
        }

        if (response.body) {
            const errors: SchemaErrors = [];

            if (SchemaDomainCheckReachability.validate(response.body, errors)) {
                if (response.body.domain === data.domain && response.body.secureKey === data.secureKey) {
                    Logger.getLogger().silly(
                        'Domain and securekey check result true.',
                        {
                            class: 'SslCertService::_requestDomainCheckReachability'
                        }
                    );

                    return true;
                }

                Logger.getLogger().error('Domain check result false!', {
                    class: 'SslCertService::_requestDomainCheckReachability'
                });
            } else {
                Logger.getLogger().error('Domain check schema is not validate!', {
                    class: 'SslCertService::_requestDomainCheckReachability'
                });
            }
        } else {
            Logger.getLogger().error('Can not request well-known flyingfish check!', {
                class: 'SslCertService::_requestDomainCheckReachability'
            });
        }

        return false;
    }

    /**
     * Update a certificate by http db object
     * @param {NginxHttpDB} http
     * @protected
     * @returns {boolean} Return true for reload nginx (certificate is created)
     */
    protected async _updateHttp(http: NginxHttpDB): Promise<boolean> {
        if (!http.ssl_enable) {
            Logger.getLogger().error(
                'ssl is not enable for http: %d',
                http.id,
                {
                    class: 'SslCertService::_updateHttp'
                }
            );

            return false;
        }

        Logger.getLogger().silly(
            'ssl is enable for http: %d',
            http.id,
            {
                class: 'SslCertService::_updateHttp'
            }
        );

        let reloadNginx = false;

        const domain = await DomainServiceDB.getInstance().findOne(http.domain_id);

        if (domain) {
            if (domain.disable) {
                Logger.getLogger().silly(
                    'domain is disable for http: %d',
                    http.id,
                    {
                        class: 'SslCertService::_updateHttp'
                    }
                );

                return false;
            }

            // ---------------------------------------------------------------------------------------------------------

            const scp = new SslCertProviders();
            const provider = await scp.getProvider(http.cert_provider);

            if (Vts.isNull(provider)) {
                Logger.getLogger().error(
                    'provider not found by \'%s\' domain, http: %d',
                    domain.domainname,
                    http.id,
                    {
                        class: 'SslCertService::_updateHttp'
                    }
                );

                return false;
            }

            let isReadyForRequest = false;

            try {
                isReadyForRequest = await provider.isReadyForRequest(
                    http.cert_last_request,
                    http.cert_create_attempts,
                    async() => {
                        Logger.getLogger().info(
                            'Time is over, rest attempts for cert request for domain: %s',
                            domain.domainname,
                            {
                                class: 'SslCertService::_updateHttp::isReadyForRequest::inlinefunc'
                            }
                        );

                        await NginxHttpServiceDB.getInstance().updateLastCertReq(http.id, 0);
                    }
                );
            } catch (eReady) {
                Logger.getLogger().error(
                    '\'%s\' (http_id: %d), domain is ready is except: %s',
                    domain.domainname,
                    http.id,
                    Ets.formate(eReady, true, true),
                    {
                        class: 'SslCertService::_updateHttp'
                    }
                );

                return false;
            }

            if (!isReadyForRequest) {
                Logger.getLogger().info(
                    'Too many attempts for cert request, waiting for domain: %s',
                    domain.domainname,
                    {
                        class: 'SslCertService::_updateHttp'
                    }
                );

                return false;
            }

            // ---------------------------------------------------------------------------------------------

            if (http.cert_email === '') {
                Logger.getLogger().info(
                    'Missing email address for domain: %s',
                    domain.domainname,
                    {
                        class: 'SslCertService::_updateHttp'
                    }
                );
            } else {
                let isCreateFailed = false;
                let isCreate = false;

                let isExist = false;
                let useWildcard = false;

                if (provider.isSupportWildcard()) {
                    useWildcard = http.cert_wildcard;
                }

                try {
                    isExist = await provider.existCertificate(domain.domainname, {wildcard: useWildcard});
                } catch (eExist) {
                    Logger.getLogger().error(
                        '\'%s\' (http_id: %d), cert is exist is except: %s',
                        domain.domainname,
                        http.id,
                        Ets.formate(eExist, true, true),
                        {
                            class: 'SslCertService::_updateHttp'
                        }
                    );

                    return false;
                }

                if (isExist) {
                    let sslBundel = null;

                    try {
                        sslBundel = await provider.getCertificationBundel(domain.domainname, {wildcard: useWildcard});
                    } catch (eBundel) {
                        Logger.getLogger().error(
                            '\'%s\' (http_id: %d), cert bundle is except: %s',
                            domain.domainname,
                            http.id,
                            Ets.formate(eBundel, true, true),
                            {
                                class: 'SslCertService::_updateHttp'
                            }
                        );

                        return false;
                    }

                    if (Vts.isNull(sslBundel)) {
                        Logger.getLogger().error(
                            'Ssl bundel not found by \'%s\' domain, http_id: $d',
                            domain.domainname,
                            http.id,
                            {
                                class: 'SslCertService::_updateHttp'
                            }
                        );

                        return false;
                    }

                    const cert = new Certificate(sslBundel.certPem);

                    if (cert.isValidate()) {
                        Logger.getLogger().info(
                            'Certificate is up to date for domain: %s',
                            domain.domainname,
                            {
                                class: 'SslCertService::_updateHttp'
                            }
                        );
                    } else {
                        try {
                            if (!await this._requestDomainCheckReachability(domain.domainname)) {
                                Logger.getLogger().error(
                                    '\'%s\' domain is not reachability, http_id: %d',
                                    domain.domainname,
                                    http.id,
                                    {
                                        class: 'SslCertService::_updateHttp'
                                    }
                                );

                                return false;
                            }
                        } catch (eDCheck) {
                            Logger.getLogger().error(
                                '\'%s\' (http_id: %d), domain check is except: %s',
                                domain.domainname,
                                http.id,
                                Ets.formate(eDCheck, true, true),
                                {
                                    class: 'SslCertService::_updateHttp'
                                }
                            );

                            return false;
                        }

                        // ---------------------------------------------------------------------------------

                        let isCertCreated = false;

                        try {
                            isCertCreated = await provider.createCertificate({
                                domainName: domain.domainname,
                                email: http.cert_email,
                                wildcard: useWildcard,
                                webRootPath: NginxServer.getInstance().getWebRootPath()
                            }, {
                                dnsServer: Dns2Server.getInstance()
                            });
                        } catch (eCreate) {
                            Logger.getLogger().error(
                                '\'%s\' (http_id: %d), domain create is except: %s',
                                domain.domainname,
                                http.id,
                                Ets.formate(eCreate, true, true),
                                {
                                    class: 'SslCertService::_updateHttp'
                                }
                            );

                            return false;
                        }

                        if (isCertCreated) {
                            Logger.getLogger().info(
                                'Certificate is renew for domain: %s',
                                domain.domainname,
                                {
                                    class: 'SslCertService::_updateHttp'
                                }
                            );

                            isCreate = true;
                            reloadNginx = true;
                        } else {
                            Logger.getLogger().error(
                                'Certificate is faild to renew for domain: %s',
                                domain.domainname,
                                {
                                    class: 'SslCertService::_updateHttp'
                                }
                            );

                            isCreateFailed = true;
                        }
                    }
                } else {
                    // -------------------------------------------------------------------------------------------------

                    try {
                        if (!await this._requestDomainCheckReachability(domain.domainname)) {
                            Logger.getLogger().error(
                                '\'%s\' domain is not reachability, http_id: %d',
                                domain.domainname,
                                http.id,
                                {
                                    class: 'SslCertService::_updateHttp'
                                }
                            );

                            return false;
                        }
                    } catch (e) {
                        Logger.getLogger().error(
                            '\'%s\' (http_id: %d), domain check is except: %s',
                            domain.domainname,
                            http.id,
                            Ets.formate(e, true, true),
                            {
                                class: 'SslCertService::_updateHttp'
                            }
                        );

                        return false;
                    }

                    // -------------------------------------------------------------------------------------------------

                    let isCertCreated = false;

                    try {
                        isCertCreated = await provider.createCertificate({
                            domainName: domain.domainname,
                            email: http.cert_email,
                            wildcard: useWildcard,
                            webRootPath: NginxServer.getInstance().getWebRootPath()
                        }, {
                            dnsServer: Dns2Server.getInstance()
                        });
                    } catch (eCreate) {
                        Logger.getLogger().error(
                            '\'%s\' (http_id: %d), domain create is except: %s',
                            domain.domainname,
                            http.id,
                            Ets.formate(eCreate, true, true),
                            {
                                class: 'SslCertService::_updateHttp'
                            }
                        );

                        return false;
                    }

                    if (isCertCreated) {
                        Logger.getLogger().info(
                            'Certificate is created for domain: %s',
                            domain.domainname,
                            {
                                class: 'SslCertService::_updateHttp'
                            }
                        );

                        isCreate = true;
                        reloadNginx = true;
                    } else {
                        Logger.getLogger().error(
                            'Certificate is faild to create for domain: %s',
                            domain.domainname,
                            {
                                class: 'SslCertService::_updateHttp'
                            }
                        );

                        isCreateFailed = true;
                    }
                }

                // -----------------------------------------------------------------------------------------------------

                if (isCreateFailed) {
                    await NginxHttpServiceDB.getInstance().updateLastCertReq(http.id, http.cert_create_attempts + 1);
                } else if (isCreate) {
                    await NginxHttpServiceDB.getInstance().updateLastCertReq(http.id, 0);
                }
            }
        }

        return reloadNginx;
    }

    /**
     * update
     */
    public async update(): Promise<void> {
        this._inProcess = true;

        const https = await NginxHttpServiceDB.getInstance().findAllBySslEnable();

        let reloadNginx = false;

        if (https) {
            for await (const http of https) {
                reloadNginx = await this._updateHttp(http);
            }
        } else {
            Logger.getLogger().info('SslCertService::update: none https setting found.', {
                class: 'SslCertService::update'
            });
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

    /**
     * Is the scheduler in a process
     * @returns {boolean}
     */
    public isInProcess(): boolean {
        return this._inProcess;
    }

}