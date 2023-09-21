import {In} from 'typeorm';
import {DBService} from './DBService.js';
import {IpLocation} from './Entity/IpLocation.js';

/**
 * Ip location service object.
 */
export class IpLocationService extends DBService<IpLocation> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'ip_location';

    /**
     * Return an intance from ip location service.
     * @returns {IpListMaintainerService}
     */
    public static getInstance(): IpLocationService {
        return DBService.getSingleInstance(
            IpLocationService,
            IpLocation,
            IpLocationService.REGISTER_NAME
        );
    }

    /**
     * Find a location by ip.
     * @param {string} ip
     * @returns {IpLocation|null}
     */
    public async findByIp(ip: string): Promise<IpLocation|null> {
        return this._repository.findOne({
            where: {
                ip: ip
            }
        });
    }

    /**
     * Find all ip locations by ids.
     * @param {number[]} ids
     * @returns {IpLocation[]}
     */
    public async findAllByIds(ids: number[]): Promise<IpLocation[]> {
        return this._repository.find({
            where: {
                id: In(ids)
            }
        });
    }

}