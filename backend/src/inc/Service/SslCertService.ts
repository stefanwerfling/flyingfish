import {DateHelper, Logger} from 'flyingfish_core';
import {Job, scheduleJob} from 'node-schedule';
import Path from 'path';
import {MoreThan} from 'typeorm';
import {Certificate} from '../Cert/Certificate.js';
import {Domain as DomainDB} from '../Db/MariaDb/Entity/Domain.js';
import {NginxHttp as NginxHttpDB} from '../Db/MariaDb/Entity/NginxHttp.js';
import {DBHelper} from '../Db/MariaDb/DBHelper.js';
import {Certbot} from '../Provider/Letsencrypt/Certbot.js';
import {NginxService} from './NginxService.js';

/**
 * SslCertService
 */
export class SslCertService {

    public static readonly CERT_CREATE_TRY = 3;

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
     * scheduler reset job
     * @protected
     */
    protected _schedulerReset: Job|null = null;

    /**
     * in process
     * @protected
     */
    protected _inProcess: boolean = false;

    /**
     * resetTry
     */
    public async resetTry(): Promise<void> {
        const httpRepository = DBHelper.getRepository(NginxHttpDB);
        const https = await httpRepository.find({
            where: {
                cert_create_attempts: MoreThan(SslCertService.CERT_CREATE_TRY)
            }
        });

        if (https) {
            for await (const http of https) {
                await httpRepository
                .createQueryBuilder()
                .update()
                .set({
                    cert_create_attempts: 0
                })
                .where('id = :id', {id: http.id})
                .execute();
            }
        }
    }

    /**
     * update
     */
    public async update(): Promise<void> {
        this._inProcess = true;

        const domainRepository = DBHelper.getRepository(DomainDB);
        const httpRepository = DBHelper.getRepository(NginxHttpDB);

        const https = await httpRepository.find();

        const certbot = new Certbot();
        let reloadNginx = false;

        if (https) {
            for await (const http of https) {
                if (http.ssl_enable) {
                    Logger.getLogger().silly(`SslCertService::update: ssl enable http: ${http.id}`);

                    const domain = await domainRepository.findOne({
                        where: {
                            id: http.domain_id
                        }
                    });

                    if (domain) {
                        if (domain.disable) {
                            Logger.getLogger().silly(`SslCertService::update: domain disable for http: ${http.id}`);
                            continue;
                        }

                        if (http.cert_create_attempts >= SslCertService.CERT_CREATE_TRY) {
                            Logger.getLogger().info(`SslCertService::update: to max try for domain: ${domain.domainname}`);
                            continue;
                        }

                        if (http.cert_email === '') {
                            Logger.getLogger().info(`SslCertService::update: missing email address for domain: ${domain.domainname}`);
                        } else {
                            const sslCert = await Certbot.existCertificate(domain.domainname);

                            let isCreateFailed = false;
                            let isCreate = false;

                            if (sslCert === null) {
                                if (await certbot.create(domain.domainname, http.cert_email)) {
                                    Logger.getLogger().info(`SslCertService::update: certificate is created for domain: ${domain.domainname}`);

                                    isCreate = true;
                                    reloadNginx = true;
                                } else {
                                    Logger.getLogger().error(`SslCertService::update: certificate is faild to create for domain: ${domain.domainname}`);
                                    isCreateFailed = true;
                                }
                            } else if (certbot.isOverLimit(http.cert_create_attempts, http.cert_last_request)) {
                                Logger.getLogger().info(`SslCertService::update: too many attempts for cert request, waiting for domain: ${domain.domainname}`);
                            } else {
                                const cert = new Certificate(Path.join(sslCert, 'cert.pem'));

                                if (cert.isValidate()) {
                                    Logger.getLogger().info(`SslCertService::update: certificate is up to date for domain: ${domain.domainname}`);
                                } else if (await certbot.create(domain.domainname, http.cert_email)) {
                                    Logger.getLogger().info(`SslCertService::update: certificate is renew for domain: ${domain.domainname}`);

                                    isCreate = true;
                                    reloadNginx = true;
                                } else {
                                    Logger.getLogger().error(`SslCertService::update: certificate is faild to renew for domain: ${domain.domainname}`);

                                    isCreateFailed = true;
                                }
                            }

                            if (isCreateFailed) {
                                await httpRepository
                                .createQueryBuilder()
                                .update()
                                .set({
                                    cert_create_attempts: http.cert_create_attempts + 1,
                                    cert_last_request: DateHelper.getCurrentDbTime()
                                })
                                .where('id = :id', {id: http.id})
                                .execute();
                            } else if (isCreate) {
                                await httpRepository
                                .createQueryBuilder()
                                .update()
                                .set({
                                    cert_create_attempts: 0,
                                    cert_last_request: DateHelper.getCurrentDbTime()
                                })
                                .where('id = :id', {id: http.id})
                                .execute();
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

        this._schedulerReset = scheduleJob('*/15 * * * *', async() => {
            await this.resetTry();
        });
    }

    /**
     * stop
     */
    public async stop(): Promise<void> {
        if (this._schedulerUpdate !== null) {
            this._schedulerUpdate.cancel();
        }

        if (this._schedulerReset !== null) {
            this._schedulerReset.cancel();
        }
    }

}