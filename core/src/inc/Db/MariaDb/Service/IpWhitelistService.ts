import {UpdateResult} from 'typeorm';
import {DateHelper} from '../../../Utils/DateHelper.js';
import {DBService} from '../DBService.js';
import {IpWhitelist} from '../Entity/IpWhitelist.js';

/**
 * Ip whitelist service object.
 */
export class IpWhitelistService extends DBService<IpWhitelist> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'ip_whitelist';

    /**
     * Return an intance from ip whitelist service.
     * @returns {IpWhitelistService}
     */
    public static getInstance(): IpWhitelistService {
        return DBService.getSingleInstance(
            IpWhitelistService,
            IpWhitelist,
            IpWhitelistService.REGISTER_NAME
        );
    }

    /**
     * Find all whitelist by location id.
     * @param {number} ipLocationId - Ip location id.
     * @returns {IpWhitelist[]}
     */
    public async findAllByLocation(ipLocationId: number): Promise<IpWhitelist[]> {
        return this._repository.find({
            where: {
                ip_location_id: ipLocationId
            }
        });
    }

    /**
     * Return whitelist entry by ip.
     * @param {string} ip - IP.
     * @param {boolean} disabled - Is whitelist entry disabled or not.
     * @returns {IpWhitelist|null}
     */
    public async findByIp(ip: string, disabled: boolean): Promise<IpWhitelist|null> {
        return this._repository.findOne({
            where: {
                ip: ip,
                disabled: disabled
            }
        });
    }

    /**
     * Update access count for whitelist entry.
     * @param {number} id - Id of whitelist entry.
     * @param {number} count - Count of access for set as update.
     * @returns {UpdateResult}
     */
    public async updateAccess(id: number, count: number): Promise<UpdateResult> {
        return this._repository
        .createQueryBuilder()
        .update()
        .set({
            last_access: DateHelper.getCurrentDbTime(),
            count_access: count
        })
        .where('id = :id', {id: id})
        .execute();
    }

    /**
     * Find all whitelist entries by order last access.
     * @param {string} orderLastAccess - Order last access DESC or ASC.
     * @returns {IpWhitelist[]}
     */
    public async findAllByOrder(orderLastAccess: string = 'DESC'): Promise<IpWhitelist[]> {
        return this._repository.find({
            order: {
                last_access: orderLastAccess === 'DESC' ? 'DESC' : 'ASC'
            }
        });
    }

}