import {ServiceJobAbstract} from 'figtree';
import {Logger} from 'flyingfish_core';
import {IpBlacklist, IpBlacklistCheck} from '../../inc/Analysis/Ip/IpBlacklist.js';
import {HowIsMyPublicIpService} from './HowIsMyPublicIpService.js';

/**
 * IpService
 *
 * Checks the host's own public IP against the RBL blacklists once an hour.
 * Migrated onto figtree's `ServiceJobAbstract` (the framework owns cron
 * scheduling, tick timing, error handling, health and restart).
 *
 * Dual role: unlike the pure job services, this class KEEPS its singleton
 * accessor and static result state, because the dashboard routes read
 * `IpService.isBlacklisted` / `IpService.foundOnRBL` and call
 * `IpService.getInstance().check()` on demand. `FlyingFishBackend` therefore
 * registers `IpService.getInstance()` (not a fresh instance) so the scheduled
 * instance and the route-facing singleton are the same object.
 *
 * Depends on the `mariadb` service; the RBL lookups also use the public IP
 * resolved by the (not-yet-migrated) `HowIsMyPublicIpService` singleton.
 */
export class IpService extends ServiceJobAbstract {

    /**
     * Name of the service.
     */
    public static readonly NAME = 'ip';

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
     * Constructor.
     */
    public constructor() {
        super(IpService.NAME, [ 'mariadb' ]);
        this._cron = '1 */1 * * *';
    }

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
                    Logger.getLogger().error('IpService::check: IP found in Blacklist: %s', result.rbl);

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
     * Start the service. Runs one immediate check (mirroring the former
     * hand-rolled `start()`) before handing the cron schedule to the framework.
     */
    public override async start(): Promise<void> {
        await super.start();
        await this.check();
    }

    /**
     * Scheduled execution (invoked by the cron tick).
     * @protected
     */
    protected override async _execute(): Promise<void> {
        await this.check();
    }

}