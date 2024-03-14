import {NginxListenCategory, NginxListenTypes} from 'flyingfish_schemas';
import {DBService} from '../DBService.js';
import {NginxListen} from '../Entity/NginxListen.js';

/**
 * Nginx listen service object.
 */
export class NginxListenService extends DBService<NginxListen> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'nginx_listen';

    /**
     * Return an intance from nginx listen service.
     * @returns {NginxListenService}
     */
    public static getInstance(): NginxListenService {
        return DBService.getSingleInstance(
            NginxListenService,
            NginxListen,
            NginxListenService.REGISTER_NAME
        );
    }

    /**
     * Find all entries by filter.
     * @param {boolean} disable
     * @returns {NginxListen[]}
     */
    public async findAllBy(disable: boolean): Promise<NginxListen[]> {
        return this._repository.find({
            where: {
                disable: disable
            }
        });
    }

    /**
     * Find an entry by type and category.
     * @param {NginxListenTypes} type
     * @param {NginxListenCategory} category
     */
    public async findByType(type: NginxListenTypes, category: NginxListenCategory): Promise<NginxListen|null> {
        return this._repository.findOne({
            where: {
                listen_type: type,
                listen_category: category
            }
        });
    }

    /**
     * Count all entries by port.
     * @param {number} port
     * @returns {number}
     */
    public async countByPort(port: number): Promise<number> {
        return this._repository.count({
            where: {
                listen_port: port
            }
        });
    }

}