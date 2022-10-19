import {Job, scheduleJob} from 'node-schedule';
import Path from 'path';
import {Certificate} from '../Cert/Certificate';
import {Domain as DomainDB} from '../Db/MariaDb/Entity/Domain';
import {NginxHttp as NginxHttpDB} from '../Db/MariaDb/Entity/NginxHttp';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import {Logger} from '../Logger/Logger';
import {Certbot} from '../Provider/Letsencrypt/Certbot';
import {NginxService} from './NginxService';

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
     * scheduler job
     * @protected
     */
    protected _scheduler: Job|null = null;

    /**
     * in process
     * @protected
     */
    protected _inProcess: boolean = false;

    /**
     * update
     */
    public async update(): Promise<void> {
        this._inProcess = true;

        const domainRepository = MariaDbHelper.getRepository(DomainDB);
        const httpRepository = MariaDbHelper.getRepository(NginxHttpDB);

        const https = await httpRepository.find();

        const certbot = new Certbot();
        let reloadNginx = false;

        if (https) {
            for (const http of https) {
                if (http.ssl_enable) {
                    Logger.getLogger().silly(`SslCertService::update: ssl enable http: ${http.id}`);

                    const domain = await domainRepository.findOne({
                        where: {
                            id: http.domain_id
                        }
                    });

                    if (domain) {
                        if (http.cert_email === '') {
                            Logger.getLogger().info(`SslCertService::update: missing email address for domain: ${domain.domainname}`);
                        } else {
                            const sslCert = Certbot.existCertificate(domain.domainname);

                            if (sslCert === null) {
                                if (await certbot.create(domain.domainname, http.cert_email)) {
                                    Logger.getLogger().info(`SslCertService::update: certificate is created for domain: ${domain.domainname}`);

                                    reloadNginx = true;
                                } else {
                                    Logger.getLogger().error(`SslCertService::update: certificate is faild to create for domain: ${domain.domainname}`);
                                }
                            } else {
                                const cert = new Certificate(Path.join(sslCert, 'cert.pem'));

                                if (cert.isValidate()) {
                                    if (await certbot.renew(domain.domainname)) {
                                        Logger.getLogger().info(`SslCertService::update: certificate is renew for domain: ${domain.domainname}`);

                                        reloadNginx = true;
                                    } else {
                                        Logger.getLogger().error(`SslCertService::update: certificate is faild to renew for domain: ${domain.domainname}`);
                                    }
                                } else {
                                    Logger.getLogger().info(`SslCertService::update: certificate is up to date for domain: ${domain.domainname}`);
                                }
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
        this._scheduler = scheduleJob('*/1 * * * *', async() => {
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
        if (this._scheduler !== null) {
            this._scheduler.cancel();
        }
    }

}