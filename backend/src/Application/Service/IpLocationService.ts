import {ServiceJobAbstract} from 'figtree';
import {
    IpBlacklistServiceDB,
    IpLocationDB,
    IpLocationServiceDB,
    IpWhitelistServiceDB,
    Logger
} from 'flyingfish_core';
import {IpLocateIo} from '../../inc/Provider/IpLocate/IpLocateIo.js';
import {Settings as GlobalSettings} from '../../inc/Settings/Settings.js';

/**
 * IpLocationService
 *
 * Resolves the geo-location for blacklisted/whitelisted IPs and back-fills the
 * `ip_location_id` on those entries. Migrated onto figtree's
 * `ServiceJobAbstract`: the framework now owns the cron scheduling, tick
 * timing, error handling, health and restart, replacing the former
 * hand-rolled `node-schedule` job wrapped in a bespoke singleton.
 *
 * Registered by `FlyingFishBackend` with a dependency on the `mariadb` service
 * so the scheduler only starts once the database is up.
 */
export class IpLocationService extends ServiceJobAbstract {

    /**
     * Name of the service.
     */
    public static readonly NAME = 'iplocation';

    /**
     * Constructor.
     */
    public constructor() {
        super(IpLocationService.NAME, [ 'mariadb' ]);
        this._cron = '*/15 * * * *';
    }

    /**
     * Resolve (and cache) the location id for an IP, creating a new
     * `IpLocationDB` entry via the IP-locate provider when unknown.
     * @param {string} ip
     * @return {number|null}
     * @protected
     * @throws Error
     */
    protected async _getIpLocation(ip: string): Promise<number | null> {
        const aIpLocation = await IpLocationServiceDB.getInstance().findByIp(ip);

        if (aIpLocation) {
            return aIpLocation.id;
        }

        const location = await IpLocateIo.location(ip);

        if (location && location.ip) {
            Logger.getLogger().info('IpLocationService::_getIpLocation: new Location by ip: %s', ip);

            let newIpLocation = new IpLocationDB();

            newIpLocation.ip = location.ip;
            newIpLocation.country = location.country || '';
            newIpLocation.country_code = location.country_code || '';
            newIpLocation.city = location.city || '';
            newIpLocation.continent = location.continent || '';
            newIpLocation.latitude = `${location.latitude}`;
            newIpLocation.longitude = `${location.longitude}`;
            newIpLocation.time_zone = location.time_zone || '';
            newIpLocation.postal_code = location.postal_code || '';
            newIpLocation.org = `${location.company?.name}`;
            newIpLocation.asn = `${location.asn?.asn}`;

            newIpLocation = await IpLocationServiceDB.getInstance().save(newIpLocation);

            return newIpLocation.id;
        }

        return null;
    }

    /**
     * Back-fill locations for the last-blocked blacklist entries and the
     * whitelist entries that have no location yet.
     */
    public async location(): Promise<void> {
        const blacklistLocate = await GlobalSettings.getSetting(
            GlobalSettings.BLACKLIST_IPLOCATE,
            GlobalSettings.BLACKLIST_IPLOCATE_DEFAULT
        );

        if (blacklistLocate === '') {
            Logger.getLogger().silly('IpLocationService::location: disabled');
            return;
        }

        // check blacklist ---------------------------------------------------------------------------------------------

        const listB = await IpBlacklistServiceDB.getInstance().findAllLastBlock(true);

        if (listB) {
            for await (const entry of listB) {
                try {
                    const ipLocationId = await this._getIpLocation(entry.ip);

                    if (ipLocationId === null) {
                        Logger.getLogger().info('IpLocationService::location: Location not found by ip: %s', entry.ip);
                    } else {
                        entry.ip_location_id = ipLocationId;

                        await IpBlacklistServiceDB.getInstance().save(entry);
                    }
                } catch (e) {
                    Logger.getLogger().error('IpLocationService::location: Exception last block updates by blacklist');
                }
            }
        }

        // check whitelist ---------------------------------------------------------------------------------------------

        const listW = await IpWhitelistServiceDB.getInstance().findAllByLocation(0);

        if (listW) {
            for await (const entry of listW) {
                try {
                    const ipLocationId = await this._getIpLocation(entry.ip);

                    if (ipLocationId === null) {
                        Logger.getLogger().info('IpLocationService::location: Location not found by ip: %s', entry.ip);
                    } else {
                        entry.ip_location_id = ipLocationId;

                        await IpWhitelistServiceDB.getInstance().save(entry);
                    }
                } catch (e) {
                    Logger.getLogger().error('IpLocationService::location: Exception updates by whitelist');
                }
            }
        }
    }

    /**
     * Start the service. Runs one immediate pass (mirroring the former
     * hand-rolled `start()`) before handing the cron schedule to the framework.
     */
    public override async start(): Promise<void> {
        await super.start();
        await this.location();
    }

    /**
     * Scheduled execution (invoked by the cron tick).
     * @protected
     */
    protected override async _execute(): Promise<void> {
        await this.location();
    }

}