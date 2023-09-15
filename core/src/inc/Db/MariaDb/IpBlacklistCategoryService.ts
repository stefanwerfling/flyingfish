import {DBService} from './DBService.js';
import {IpBlacklistCategory} from './Entity/IpBlacklistCategory.js';

/**
 * Ip blacklist category service object.
 */
export class IpBlacklistCategoryService extends DBService<IpBlacklistCategory> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'ip_blacklist_category';

    /**
     * Return an intance from ip blacklist category service.
     * @returns {GatewayIdentifierService}
     */
    public static getInstance(): IpBlacklistCategoryService {
        return DBService.getSingleInstance(
            IpBlacklistCategoryService,
            IpBlacklistCategory,
            IpBlacklistCategoryService.REGISTER_NAME
        );
    }

    /**
     * Find all categories by IP ID.
     * @param {number} ipId - IP ID from blacklist.
     * @returns {IpBlacklistCategory[]}
     */
    public async findAllByIp(ipId: number): Promise<IpBlacklistCategory[]> {
        return this._repository.find({
            where: {
                ip_id: ipId
            }
        });
    }

    /**
     * Find a Category by IP ID and cat num.
     * @param {number} ipId - IP ID from blacklist.
     * @param {number} catNum - Category number.
     * @returns {IpBlacklistCategory|null}
     */
    public async findByIpAndCatnum(ipId: number, catNum: number): Promise<IpBlacklistCategory|null> {
        return this._repository.findOne({
            where: {
                ip_id: ipId,
                cat_num: catNum
            }
        });
    }

}