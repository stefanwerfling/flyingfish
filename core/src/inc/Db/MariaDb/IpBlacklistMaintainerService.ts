import {DBService} from './DBService.js';
import {IpBlacklistMaintainer} from './Entity/IpBlacklistMaintainer.js';

/**
 * Ip blacklist maintainer service object.
 */
export class IpBlacklistMaintainerService extends DBService<IpBlacklistMaintainer> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'ip_blacklist_maintainer';

    /**
     * Return an intance from ip blacklist maintainer service.
     * @returns {IpBlacklistMaintainerService}
     */
    public static getInstance(): IpBlacklistMaintainerService {
        return DBService.getSingleInstance(
            IpBlacklistMaintainerService,
            IpBlacklistMaintainer,
            IpBlacklistMaintainerService.REGISTER_NAME
        );
    }

    /**
     * Find a blacklist maintainer by ip id and ip maintainer id.
     * @param {number} ipId
     * @param {number} ipMaintainerId
     * @returns {IpBlacklistMaintainer|null}
     */
    public async findByIp(ipId: number, ipMaintainerId: number): Promise<IpBlacklistMaintainer|null> {
        return this._repository.findOne({
            where: {
                ip_id: ipId,
                ip_maintainer_id: ipMaintainerId
            }
        });
    }

    /**
     * Find all blacklist maintainers by ip id.
     * @param {number} ipId
     * @returns {IpBlacklistMaintainer[]}
     */
    public async findAllByIp(ipId: number): Promise<IpBlacklistMaintainer[]> {
        return this._repository.find({
            where: {
                ip_id: ipId
            }
        });
    }

}