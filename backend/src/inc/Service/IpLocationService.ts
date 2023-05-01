import {Logger} from 'flyingfish_core';
import {Job, scheduleJob} from 'node-schedule';
import {MoreThan} from 'typeorm';
import {DBHelper} from '../Db/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../Db/MariaDb/Entity/IpBlacklist.js';
import {IpLocation as IpLocationDB} from '../Db/MariaDb/Entity/IpLocation.js';
import {IpWhitelist as IpWhitelistDB} from '../Db/MariaDb/Entity/IpWhitelist.js';
import {IpLocateIo} from '../Provider/IpLocate/IpLocateIo.js';
import {Settings as GlobalSettings} from '../Settings/Settings.js';

/**
 * IpLocationService
 */
export class IpLocationService {

    /**
     * instance
     * @private
     */
    private static _instance: IpLocationService|null = null;

    /**
     * getInstance
     */
    public static getInstance(): IpLocationService {
        if (IpLocationService._instance === null) {
            IpLocationService._instance = new IpLocationService();
        }

        return IpLocationService._instance;
    }

    /**
     * scheduler job
     * @protected
     */
    protected _scheduler: Job|null = null;

    /**
     * _getIpLocation
     * @param ip
     * @protected
     */
    protected async _getIpLocation(ip: string): Promise<number | null> {
        const ipLocationRepository = DBHelper.getRepository(IpLocationDB);
        const aIpLocation = await ipLocationRepository.findOne({
            where: {
                ip: ip
            }
        });

        if (aIpLocation) {
            return aIpLocation.id;
        }

        const location = await IpLocateIo.location(ip);

        if (location && location.ip) {
            Logger.getLogger().info(`IpLocationService::_getIpLocation: new Location by ip: ${ip}`);

            let newIpLocation = new IpLocationDB();

            newIpLocation.ip = location.ip;
            newIpLocation.country = location.country || '';
            newIpLocation.country_code = location.country_code || '';
            newIpLocation.city = location.city || '';
            newIpLocation.continent = location.continent || '';
            newIpLocation.latitude = location.latitude || '';
            newIpLocation.longitude = location.longitude || '';
            newIpLocation.time_zone = location.time_zone || '';
            newIpLocation.postal_code = location.postal_code || '';
            newIpLocation.org = location.org || '';
            newIpLocation.asn = location.asn || '';

            newIpLocation = await DBHelper.getDataSource().manager.save(newIpLocation);

            return newIpLocation.id;
        }

        return null;
    }

    /**
     * location
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

        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

        const listB = await ipBlacklistRepository.find({
            where: {
                count_block: MoreThan(0),
                ip_location_id: 0
            }
        });

        if (listB) {
            for await (const entry of listB) {
                const ipLocationId = await this._getIpLocation(entry.ip);

                if (ipLocationId === null) {
                    Logger.getLogger().info(`IpLocationService::location: Location not found by ip: ${entry.ip}`);
                } else {
                    entry.ip_location_id = ipLocationId;

                    await DBHelper.getDataSource().manager.save(entry);
                }
            }
        }

        // check whitelist ---------------------------------------------------------------------------------------------

        const ipWhitelistRepository = DBHelper.getRepository(IpWhitelistDB);

        const listW = await ipWhitelistRepository.find({
            where: {
                ip_location_id: 0
            }
        });

        if (listW) {
            for await (const entry of listW) {
                const ipLocationId = await this._getIpLocation(entry.ip);

                if (ipLocationId === null) {
                    Logger.getLogger().info(`IpLocationService::location: Location not found by ip: ${entry.ip}`);
                } else {
                    entry.ip_location_id = ipLocationId;

                    await DBHelper.getDataSource().manager.save(entry);
                }
            }
        }
    }

    /**
     * start
     */
    public async start(): Promise<void> {
        await this.location();

        this._scheduler = scheduleJob('*/15 * * * *', async() => {
            await this.location();
        });
    }

}