import {Packet} from 'dns2';
import {Job, scheduleJob} from 'node-schedule';
import {DomainRecord as DomainRecordDB} from '../Db/MariaDb/Entity/DomainRecord';
import {DynDnsClient as DynDnsClientDB} from '../Db/MariaDb/Entity/DynDnsClient';
import {DynDnsClientDomain as DynDnsClientDomainDB} from '../Db/MariaDb/Entity/DynDnsClientDomain';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import {Logger} from '../Logger/Logger';
import {DynDnsProviders} from '../Provider/DynDnsProviders';
import {DateHelper} from '../Utils/DateHelper';
import {HowIsMyPublicIpService} from './HowIsMyPublicIpService';

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
        const dyndnsclientRepository = MariaDbHelper.getRepository(DynDnsClientDB);
        const dyndnsclientDomainRepository = MariaDbHelper.getRepository(DynDnsClientDomainDB);
        const domainRecordRepository = MariaDbHelper.getRepository(DomainRecordDB);

        const clients = await dyndnsclientRepository.find();

        for (const client of clients) {
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
                        for (const dyndnsdomain of dyndnsdomains) {
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
                                    for (const record of records) {
                                        switch (record.dtype) {
                                            case Packet.TYPE.TXT:
                                            case Packet.TYPE.CNAME:
                                                continue;

                                            default:
                                                record.dvalue = myIp;
                                        }

                                        record.last_update = DateHelper.getCurrentDbTime();

                                        await MariaDbHelper.getConnection().manager.save(record);

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