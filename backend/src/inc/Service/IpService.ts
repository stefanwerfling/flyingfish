import {Logger} from 'flyingfish_core';
import {Job, scheduleJob} from 'node-schedule';
import {IpBlacklist, IpBlacklistCheck} from '../Analysis/Ip/IpBlacklist.js';
import {HowIsMyPublicIpService} from './HowIsMyPublicIpService.js';

/**
 * IpService
 */
export class IpService {

    /**
     * instance
     * @private
     */
    private static _instance: IpService|null = null;

    /**
     * is blacklisted
     */
    public static isBlacklisted = false;

    /**
     * found on RBL
     */
    public static foundOnRBL: IpBlacklistCheck[] = [];

    /**
     * getInstance
     */
    public static getInstance(): IpService {
        if (IpService._instance === null) {
            IpService._instance = new IpService();
        }

        return IpService._instance;
    }

    /**
     * scheduler job
     * @protected
     */
    protected _scheduler: Job|null = null;

    /**
     * check
     */
    public async check(): Promise<void> {
        const myIp = await HowIsMyPublicIpService.getInstance().getCurrentIp();

        if (myIp) {
            const ipb = new IpBlacklist();
            const results = await ipb.check(myIp);

            IpService.foundOnRBL = [];

            let isFound = false;

            for (const result of results) {
                if (result.listed) {
                    Logger.getLogger().error(`IpService::check: IP found in Blacklist: ${result.rbl}`);

                    isFound = true;
                }

                IpService.foundOnRBL.push(result);
            }

            if (isFound) {
                IpService.isBlacklisted = true;
            } else {
                IpService.isBlacklisted = false;

                Logger.getLogger().info('IpService::check: IP successfully');
            }
        } else {
            Logger.getLogger().info('IpService::check: public ip not dedected for use!');
        }
    }

    /**
     * start
     */
    public async start(): Promise<void> {
        await this.check();

        this._scheduler = scheduleJob('1 */1 * * *', async() => {
            await this.check();
        });
    }

}