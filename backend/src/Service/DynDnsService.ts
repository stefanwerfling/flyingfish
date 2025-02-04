import DNS from 'dns2';
import {
    DateHelper,
    DomainRecordServiceDB, DomainServiceDB, DynDnsClientDB,
    DynDnsClientDomainServiceDB,
    DynDnsClientServiceDB, GatewayIdentifierServiceDB,
    Logger
} from 'flyingfish_core';
import {Job, scheduleJob} from 'node-schedule';
import {HimHIP} from '../inc/HimHIP/HimHIP.js';
import {DynDnsProviders} from '../inc/Provider/DynDnsProviders.js';
import {HowIsMyPublicIpService} from './HowIsMyPublicIpService.js';

/**
 * DynDnsService
 */
export class DynDnsService {

    /**
     * instance
     * @private
     */
    private static _instance: DynDnsService | null = null;

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
    protected _scheduler: Job | null = null;

    /**
     * in process
     * @protected
     */
    protected _inProcess: boolean = false;

    /**
     * updateDns
     * @param {number|null} clientId
     * @protected
     */
    public async updateDns(clientId: number|null = null): Promise<void> {
        this._inProcess = true;

        Logger.getLogger().silly('DynDnsService::updateDns: exec schedule job');

        const currentIp = await HowIsMyPublicIpService.getInstance().getCurrentIp();
        const currentIp6 = await HowIsMyPublicIpService.getInstance().getCurrentIp6();
        const hostnames: string[] = [];

        let clients: DynDnsClientDB[] = [];

        if (clientId === null ) {
            clients = await DynDnsClientServiceDB.getInstance().findAll();
        } else {
            const aClient = await DynDnsClientServiceDB.getInstance().findOne(clientId);

            if (aClient) {
                clients.push(aClient);
            } else {
                Logger.getLogger().error('DynDnsService::updateDns: client not found by id: %d', clientId);
            }
        }


        for await (const client of clients) {
            const provider = DynDnsProviders.getProvider(client.provider);

            if (!provider) {
                Logger.getLogger().error('DynDnsService::updateDns: provider not found by name: %s', client.provider);
                continue;
            }

            // check used gateway and is inside this gateway -----------------------------------------------------------

            if (client.gateway_identifier_id !== 0) {
                const himhip = HimHIP.getData();

                if (himhip) {
                    const gatewayId = await GatewayIdentifierServiceDB.getInstance().findByMac(himhip.gatewaymac);

                    if (gatewayId) {
                        if (gatewayId.id !== client.gateway_identifier_id) {
                            Logger.getLogger().warn('DynDnsService::updateDns: Client is not in the right gateway: %s', gatewayId.mac_address);
                            continue;
                        }

                        Logger.getLogger().info('DynDnsService::updateDns: Client allowed in the gateway: %s', gatewayId.mac_address);
                    } else {
                        Logger.getLogger().error('DynDnsService::updateDns: Gateway not found: %s (%d)', client.provider, client.id);
                        continue;
                    }
                } else {
                    Logger.getLogger().warn('DynDnsService::updateDns: HimHIP is not ready, skip update job: %s (%d)', client.provider, client.id);
                    continue;
                }
            }

            // ---------------------------------------------------------------------------------------------------------

            let updateIp = true;

            // check dns ip have change --------------------------------------------------------------------------------

            if (client.main_domain_id !== 0 && currentIp !== null) {
                const domain = await DomainServiceDB.getInstance().findOne(client.main_domain_id);

                if (domain) {
                    hostnames.push(domain.domainname);

                    try {
                        const resolver = new DNS();
                        const result = await resolver.resolveA(domain.domainname);

                        if (result) {
                            for (const answer of result.answers) {
                                if (answer.address !== undefined && answer.address === currentIp) {
                                    updateIp = false;
                                }
                            }
                        }
                    } catch (e) {
                        Logger.getLogger().error(e);
                    }
                }
            }

            if (!updateIp) {
                // when ip is the same, we jump to the next client
                continue;
            }

            // update dyndns client domains ----------------------------------------------------------------------------

            const providerResult = await provider.update({
                username: client.username,
                password: client.password,
                ip: currentIp,
                ip6: currentIp6,
                hostnames: hostnames
            });

            // ---------------------------------------------------------------------------------------------------------

            // update last update time
            await DynDnsClientServiceDB.getInstance().updateStatus(client.id, providerResult.status);

            if (providerResult.result) {
                Logger.getLogger().info('DynDnsService::updateDns: Domain ip update by provider(%s)', provider.getName());

                if (client.update_domain) {
                    const dyndnsdomains = await DynDnsClientDomainServiceDB.getInstance().findAllByClientId(client.id);

                    if (dyndnsdomains) {
                        for await (const dyndnsdomain of dyndnsdomains) {
                            Logger.getLogger().info('DynDnsService::updateDns: Update domain ip for domain-id: %d', dyndnsdomain.domain_id);

                            const records = await DomainRecordServiceDB.getInstance().findAllByDomainUpdateDnsClient(
                                dyndnsdomain.domain_id,
                                true
                            );

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

                                        await DomainRecordServiceDB.getInstance().save(record);

                                        Logger.getLogger().info(
                                            'DynDnsService::updateDns: domain record updated by domain-id: %d with ip: %s',
                                            dyndnsdomain.domain_id,
                                            myIp
                                        );
                                    }
                                } else {
                                    Logger.getLogger().warn(
                                        'DynDnsService::updateDns: own ip not determined by domain-id: %d',
                                        dyndnsdomain.domain_id
                                    );
                                }
                            } else {
                                Logger.getLogger().warn(
                                    'DynDnsService::updateDns: domain record not found by domain-id: %d',
                                    dyndnsdomain.domain_id
                                );
                            }
                        }
                    }
                }
            } else {
                Logger.getLogger().warn(
                    'DynDnsService::updateDns: Domain ip update faild by provider(%s)',
                    provider.getName()
                );
            }
        }

        this._inProcess = false;
    }

    /**
     * start
     */
    public async start(): Promise<void> {
        await this.updateDns();

        this._scheduler = scheduleJob('1 */1 * * *', async() => {
            if (this._inProcess) {
                return;
            }

            await this.updateDns();
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

    /**
     * call the scheduler
     */
    public async invokeUpdate(): Promise<void> {
        if (this._scheduler !== null) {
            this._scheduler.invoke();
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