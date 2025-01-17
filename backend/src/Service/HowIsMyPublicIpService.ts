import {Logger} from 'flyingfish_core';
import {Job, scheduleJob} from 'node-schedule';
import {Config} from '../inc/Config/Config.js';
import {HowIsMyPublicIpProviders} from '../inc/Provider/HowIsMyPublicIpProviders.js';
import {DynDnsService} from './DynDnsService.js';

/**
 * HowIsMyPublicIpService
 */
export class HowIsMyPublicIpService {

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
     * scheduler job
     * @protected
     */
    protected _scheduler: Job|null = null;

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
        const providername = Config.getInstance().get()?.himpip?.provider!;
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
                    if (Config.getInstance().get()?.dyndnsclient) {
                        if (Config.getInstance().get()?.dyndnsclient?.enable) {
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
     * start
     */
    public async start(): Promise<void> {
        await this.determined();

        this._scheduler = scheduleJob('*/1 * * * *', async() => {
            await this.determined();
        });
    }

}