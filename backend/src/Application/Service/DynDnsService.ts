import DNS from 'dns2';
import {DateHelper, Logger, ServiceJobAbstract} from 'figtree';
import {
    DomainRecordServiceDB, DomainServiceDB, DynDnsClientDB,
    DynDnsClientDomainServiceDB,
    DynDnsClientServiceDB, GatewayIdentifierServiceDB
} from 'flyingfish_core';
import {HimHIP} from '../../inc/HimHIP/HimHIP.js';
import {DynDnsProviders} from '../../inc/Provider/DynDnsProviders.js';
import {HowIsMyPublicIpService} from './HowIsMyPublicIpService.js';

/**
 * DynDnsService
 *
 * Pushes the host's current public IP to the configured DynDNS providers once
 * an hour (and on demand). Migrated onto figtree's `ServiceJobAbstract`: the
 * framework owns the cron scheduling, tick timing, error handling, health and
 * restart, replacing the former hand-rolled `node-schedule` job.
 *
 * Dual role: KEEPS its singleton accessor because `HowIsMyPublicIpService`
 * triggers `updateDns()` on IP change and the DynDNS "run now" route reads
 * `isInProcess()` / calls `invokeUpdate()`. Conditionally registered by
 * `FlyingFishBackend` only when `config.dyndnsclient.enable` is set (the former
 * `main.ts` gated the start the same way). Depends on the `mariadb` service.
 *
 * NOTE: the overlap guard uses a distinct `_updateInProcess` flag — the base
 * `ServiceAbstract` already owns a protected `_inProcess` field for its own
 * start bookkeeping, so the original field was renamed to avoid the collision.
 */
export class DynDnsService extends ServiceJobAbstract {

    /**
     * Name of the service.
     */
    public static readonly NAME = 'dyndns';

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
     * update in process (overlap guard for updateDns)
     * @protected
     */
    protected _updateInProcess: boolean = false;

    /**
     * Constructor.
     */
    public constructor() {
        super(DynDnsService.NAME, [ 'mariadb' ]);
        this._cron = '1 */1 * * *';
    }

    /**
     * updateDns
     * @param {number|null} clientId
     * @protected
     */
    public async updateDns(clientId: number|null = null): Promise<void> {
        this._updateInProcess = true;

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

                                        record.last_update = DateHelper.getCurrentTime();

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

        this._updateInProcess = false;
    }

    /**
     * Start the service. Runs one immediate update (mirroring the former
     * hand-rolled `start()`) before handing the cron schedule to the framework.
     */
    public override async start(): Promise<void> {
        await super.start();
        await this.updateDns();
    }

    /**
     * Scheduled execution (invoked by the cron tick). Skips overlapping runs
     * via the `_updateInProcess` guard, as the former scheduler callback did.
     * @protected
     */
    protected override async _execute(): Promise<void> {
        if (this._updateInProcess) {
            return;
        }

        await this.updateDns();
    }

    /**
     * call the scheduler
     */
    public async invokeUpdate(): Promise<void> {
        await this.invoke();
    }

    /**
     * Is the scheduler in a process
     * @returns {boolean}
     */
    public isInProcess(): boolean {
        return this._updateInProcess;
    }

}