import {ServiceJobAbstract} from 'figtree';
import {Logger} from 'flyingfish_core';
import {FlyingFishConfig} from '../Config/FlyingFishConfig.js';
import {HowIsMyPublicIpProviders} from '../../inc/Provider/HowIsMyPublicIpProviders.js';
import {DynDnsService} from './DynDnsService.js';

/**
 * HowIsMyPublicIpService
 *
 * Determines the host's current public IPv4/IPv6 once a minute via the
 * configured provider and, on change, triggers the DynDNS client update.
 * Migrated onto figtree's `ServiceJobAbstract` (the framework owns cron
 * scheduling, tick timing, error handling, health and restart).
 *
 * Dual role: KEEPS its singleton accessor and cached `_currentIp`/`_currentIp6`
 * state, because several consumers read the resolved IP on demand via
 * `HowIsMyPublicIpService.getInstance().getCurrentIp()` — the DynDNS service,
 * the dashboard info route and the domain-record save route. `FlyingFishBackend`
 * therefore registers `getInstance()` (not a fresh instance) so the scheduled
 * instance and the consumer-facing singleton are the same object.
 */
export class HowIsMyPublicIpService extends ServiceJobAbstract {

    /**
     * Name of the service.
     */
    public static readonly NAME = 'howismypublicip';

    /**
     * instance
     * @private
     */
    private static _instance: HowIsMyPublicIpService|null = null;

    /**
     * getInstance
     */
    public static getInstance(): HowIsMyPublicIpService {
        if (HowIsMyPublicIpService._instance === null) {
            HowIsMyPublicIpService._instance = new HowIsMyPublicIpService();
        }

        return HowIsMyPublicIpService._instance;
    }

    /**
     * current ip
     * @protected
     */
    protected _currentIp: string|null = null;

    /**
     * current ip6
     * @protected
     */
    protected _currentIp6: string|null = null;

    /**
     * Constructor.
     */
    public constructor() {
        super(HowIsMyPublicIpService.NAME, [ 'mariadb' ]);
        this._cron = '*/1 * * * *';
    }

    /**
     * Return the current IP
     * @param {boolean} determine
     * @returns {string|null}
     */
    public async getCurrentIp(determine: boolean = true): Promise<string | null> {
        if (this._currentIp === null) {
            if (determine) {
                await this.determined();
            }
        }

        return this._currentIp;
    }

    /**
     * Return the current IP6
     * @param {boolean} determine
     * @returns {string|null}
     */
    public async getCurrentIp6(determine: boolean = true): Promise<string | null> {
        if (this._currentIp6 === null) {
            if (determine) {
                await this.determined();
            }
        }

        return this._currentIp6;
    }

    /**
     * determined
     */
    public async determined(): Promise<void> {
        const providername = FlyingFishConfig.getInstance().get()?.himpip?.provider!;
        const provider = HowIsMyPublicIpProviders.getProvider(providername);

        if (provider) {
            if (this._currentIp === null) {
                this._currentIp = await provider.get();
                this._currentIp6 = await provider.get64();

                Logger.getLogger().info('HowIsMyPublicIpService::determined: Set my current public ip(%s)', this._currentIp);
                Logger.getLogger().info('HowIsMyPublicIpService::determined: Set my current public ip6(%s)', this._currentIp6);
            } else {
                const ip = await provider.get();
                const ip6 = await provider.get64();
                let hasChanges = false;

                if (this._currentIp === ip) {
                    Logger.getLogger().silly('HowIsMyPublicIpService::determined: Public ip has not change: %s', ip);
                } else {
                    Logger.getLogger().info('HowIsMyPublicIpService::determined: Public ip change old(%s) new(%s)', this._currentIp, ip);

                    this._currentIp = ip;
                    hasChanges = true;
                }

                if (this._currentIp6 === ip6) {
                    Logger.getLogger().silly('HowIsMyPublicIpService::determined: Public ip6 has not change: %s', ip6);
                } else {
                    this._currentIp6 = ip6;
                    hasChanges = true;
                }

                if (hasChanges) {
                    if (FlyingFishConfig.getInstance().get()?.dyndnsclient) {
                        if (FlyingFishConfig.getInstance().get()?.dyndnsclient?.enable) {
                            await DynDnsService.getInstance().updateDns();
                        } else {
                            Logger.getLogger().silly('HowIsMyPublicIpService::determined: DynDnsClient is disabled by config!');
                        }
                    } else {
                        Logger.getLogger().warn('HowIsMyPublicIpService::determined: DynDnsClient config not found!');
                    }
                }
            }
        } else {
            Logger.getLogger().warn('HowIsMyPublicIpService::determined: none provider found by config: %s', providername);
        }
    }

    /**
     * Start the service. Runs one immediate determination (mirroring the former
     * hand-rolled `start()`) before handing the cron schedule to the framework.
     */
    public override async start(): Promise<void> {
        await super.start();
        await this.determined();
    }

    /**
     * Scheduled execution (invoked by the cron tick).
     * @protected
     */
    protected override async _execute(): Promise<void> {
        await this.determined();
    }

}