import {Packet} from 'dns2';
import {Job, scheduleJob} from 'node-schedule';
import {DomainRecord as DomainRecordDB} from '../Db/MariaDb/Entity/DomainRecord';
import {DynDnsClient as DynDnsClientDB} from '../Db/MariaDb/Entity/DynDnsClient';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import {Logger} from '../Logger/Logger';
import {DynDnsProviders} from '../Provider/DynDnsProviders';
import {HowIsMyPublicIpProviders} from '../Provider/HowIsMyPublicIpProviders';
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
        const dyndnclientRepository = MariaDbHelper.getRepository(DynDnsClientDB);
        const domainRecordRepository = MariaDbHelper.getRepository(DomainRecordDB);

        const clients = await dyndnclientRepository.find();

        for (const client of clients) {
            const provider = DynDnsProviders.getProvider(client.provider);

            if (await provider?.update(client.username, client.password, '')) {
                Logger.getLogger().info(`DynDnsService::updateDns: Domain ip update by provider(${provider?.getName()})`);

                if (client.update_domain) {
                    Logger.getLogger().info(`DynDnsService::updateDns: Update domain ip for domain-id: ${client.domain_id}`);

                    const record = await domainRecordRepository.findOne({
                        where: {
                            domain_id: client.domain_id,
                            dtype: Packet.TYPE.A,
                            dclass: Packet.CLASS.IN
                        }
                    });

                    if (record) {
                        const myIp = HowIsMyPublicIpService.getInstance().getCurrentIp();

                        if (myIp) {
                            record.dvalue = myIp;

                            await MariaDbHelper.getConnection().manager.save(record);

                            Logger.getLogger().info(`DynDnsService::updateDns: domain record updated by domain-id: ${client.domain_id} with ip: ${myIp}`);
                        } else {
                            Logger.getLogger().warn(`DynDnsService::updateDns: own ip not determined by domain-id: ${client.domain_id}`);
                        }
                    } else {
                        Logger.getLogger().warn(`DynDnsService::updateDns: domain record not found by domain-id: ${client.domain_id}`);
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
        this.updateDns();

        this._scheduler = scheduleJob('1 */1 * * *', async() => {
            this.updateDns();
        });
    }

}