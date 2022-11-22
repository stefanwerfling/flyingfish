import DNS from 'dns2';
import {Job, scheduleJob} from 'node-schedule';
import {DBHelper} from '../Db/DBHelper.js';
import {DomainRecord as DomainRecordDB} from '../Db/MariaDb/Entity/DomainRecord.js';
import {DynDnsClient as DynDnsClientDB} from '../Db/MariaDb/Entity/DynDnsClient.js';
import {DynDnsClientDomain as DynDnsClientDomainDB} from '../Db/MariaDb/Entity/DynDnsClientDomain.js';
import {Logger} from '../Logger/Logger.js';
import {DynDnsProviders} from '../Provider/DynDnsProviders.js';
import {DateHelper} from '../Utils/DateHelper.js';
import {HowIsMyPublicIpService} from './HowIsMyPublicIpService.js';

/**
 * DynDnsService
 */
export class DynDnsService {

    /**
     * instance
     * @private
     */
    private static _instance: DynDnsService|null = null;

    /**
     * getInstance
     */
    public static getInstance(): DynDnsService {
        if (DynDnsService._instance === null) {
            DynDnsService._instance = new DynDnsService();
        }

        return DynDnsService._instance;
    }

    /**
     * scheduler job
     * @protected
     */
    protected _scheduler: Job|null = null;

    /**
     * updateDns
     * @protected
     */
    public async updateDns(): Promise<void> {
        Logger.getLogger().silly('DynDnsService::updateDns: exec schedule job');

        const dyndnsclientRepository = DBHelper.getRepository(DynDnsClientDB);
        const dyndnsclientDomainRepository = DBHelper.getRepository(DynDnsClientDomainDB);
        const domainRecordRepository = DBHelper.getRepository(DomainRecordDB);

        const clients = await dyndnsclientRepository.find();

        for await (const client of clients) {
            const provider = DynDnsProviders.getProvider(client.provider);

            if (!provider) {
                Logger.getLogger().error(`DynDnsService::updateDns: provider not found by name: ${client.provider}`);
                continue;
            }

            const providerResult = await provider.update(client.username, client.password, '');

            // update last update time
            await dyndnsclientRepository
            .createQueryBuilder()
            .update()
            .set({
                last_status: providerResult.status,
                last_update: DateHelper.getCurrentDbTime()
            })
            .where('id = :id', {id: client.id})
            .execute();

            if (providerResult.result) {
                Logger.getLogger().info(`DynDnsService::updateDns: Domain ip update by provider(${provider?.getName()})`);

                if (client.update_domain) {
                    const dyndnsdomains = await dyndnsclientDomainRepository.find({
                        where: {
                            dyndnsclient_id: client.id
                        }
                    });

                    if (dyndnsdomains) {
                        for await (const dyndnsdomain of dyndnsdomains) {
                            Logger.getLogger().info(`DynDnsService::updateDns: Update domain ip for domain-id: ${dyndnsdomain.domain_id}`);

                            const records = await domainRecordRepository.find({
                                where: {
                                    domain_id: dyndnsdomain.domain_id,
                                    update_by_dnsclient: true
                                }
                            });

                            if (records) {
                                const myIp = await HowIsMyPublicIpService.getInstance().getCurrentIp();

                                if (myIp) {
                                    for await (const record of records) {
                                        switch (record.dtype) {
                                            case DNS.Packet.TYPE.TXT:
                                            case DNS.Packet.TYPE.CNAME:
                                                continue;

                                            default:
                                                record.dvalue = myIp;
                                        }

                                        record.last_update = DateHelper.getCurrentDbTime();

                                        await DBHelper.getDataSource().manager.save(record);

                                        Logger.getLogger().info(`DynDnsService::updateDns: domain record updated by domain-id: ${dyndnsdomain.domain_id} with ip: ${myIp}`);
                                    }
                                } else {
                                    Logger.getLogger().warn(`DynDnsService::updateDns: own ip not determined by domain-id: ${dyndnsdomain.domain_id}`);
                                }
                            } else {
                                Logger.getLogger().warn(`DynDnsService::updateDns: domain record not found by domain-id: ${dyndnsdomain.domain_id}`);
                            }
                        }
                    }
                }
            } else {
                Logger.getLogger().warn(`DynDnsService::updateDns: Domain ip update faild by provider(${provider?.getName()})`);
            }
        }
    }

    /**
     * start
     */
    public async start(): Promise<void> {
        await this.updateDns();

        this._scheduler = scheduleJob('1 */1 * * *', async() => {
            await this.updateDns();
        });
    }

}