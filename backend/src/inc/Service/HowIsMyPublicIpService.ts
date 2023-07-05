import {Logger} from 'flyingfish_core';
import {Job, scheduleJob} from 'node-schedule';
import {Config} from '../Config/Config.js';
import {HowIsMyPublicIpProviders} from '../Provider/HowIsMyPublicIpProviders.js';
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
     * getCurrentIp
     * @param determine
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
     * determined
     */
    public async determined(): Promise<void> {
        const providername = Config.getInstance().get()?.himpip?.provider!;
        const provider = HowIsMyPublicIpProviders.getProvider(providername);

        if (provider) {
            if (this._currentIp === null) {
                this._currentIp = await provider.get();

                Logger.getLogger().info(`HowIsMyPublicIpService::determined: Set my current public ip(${this._currentIp})`);
            } else {
                const ip = await provider.get();

                if (this._currentIp === ip) {
                    Logger.getLogger().silly(`HowIsMyPublicIpService::determined: Public ip has not change: ${ip}`);
                } else {
                    Logger.getLogger().info(`HowIsMyPublicIpService::determined: Public ip change old(${this._currentIp}) new(${ip})`);

                    this._currentIp = ip;

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
            Logger.getLogger().warn(`HowIsMyPublicIpService::determined: none provider found by config: ${providername}`);
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