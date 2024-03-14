import {DBService} from '../DBService.js';
import {IpListMaintainer} from '../Entity/IpListMaintainer.js';

/**
 * Ip list maintainer service object.
 */
export class IpListMaintainerService extends DBService<IpListMaintainer> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'ip_list_maintainer';

    /**
     * Return an intance from ip list maintainer service.
     * @returns {IpListMaintainerService}
     */
    public static getInstance(): IpListMaintainerService {
        return DBService.getSingleInstance(
            IpListMaintainerService,
            IpListMaintainer,
            IpListMaintainerService.REGISTER_NAME
        );
    }

    /**
     * Find an ip list maintainer by name.
     * @param {string} name
     * @returns {IpListMaintainer|null}
     */
    public async findByMaintainerName(name: string): Promise<IpListMaintainer|null> {
        return this._repository.findOne({
            where: {
                maintainer_name: name
            }
        });
    }

}