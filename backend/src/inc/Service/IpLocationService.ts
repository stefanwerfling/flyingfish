import {Job, scheduleJob} from 'node-schedule';
import {MoreThan} from 'typeorm';
import {DBHelper} from '../Db/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../Db/MariaDb/Entity/IpBlacklist.js';
import {IpLocation as IpLocationDB} from '../Db/MariaDb/Entity/IpLocation.js';
import {Logger} from '../Logger/Logger.js';
import {IpLocate} from '../Provider/IpLocate/IpLocate.js';

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
     * location
     */
    public async location(): Promise<void> {
        // check blacklist ---------------------------------------------------------------------------------------------

        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);
        const ipLocationRepository = DBHelper.getRepository(IpLocationDB);

        const list = await ipBlacklistRepository.find({
            where: {
                count_block: MoreThan(0),
                ip_location_id: 0
            }
        });

        if (list) {
            for await (const entry of list) {
                const aIpLocation = await ipLocationRepository.findOne({
                    where: {
                        ip: entry.ip
                    }
                });

                if (aIpLocation) {
                    entry.ip_location_id = aIpLocation.id;

                    await DBHelper.getDataSource().manager.save(entry);
                } else {
                    const location = await IpLocate.location(entry.ip);

                    if (location && location.ip) {
                        Logger.getLogger().info(`new Location by ip: ${entry.ip}`);

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

                        entry.ip_location_id = newIpLocation.id;

                        await DBHelper.getDataSource().manager.save(entry);
                    } else {
                        Logger.getLogger().info(`Location not found by ip: ${entry.ip}`);
                    }
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