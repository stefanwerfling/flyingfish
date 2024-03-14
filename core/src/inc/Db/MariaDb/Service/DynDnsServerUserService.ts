import {UpdateResult} from 'typeorm';
import {DateHelper} from '../../../Utils/DateHelper.js';
import {DBService} from '../DBService.js';
import {DynDnsServerUser} from '../Entity/DynDnsServerUser.js';

/**
 * DynDnsServerUserService
 */
export class DynDnsServerUserService extends DBService<DynDnsServerUser> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'dyndns_server_user';

    /**
     * getInstance
     */
    public static getInstance(): DynDnsServerUserService {
        return DBService.getSingleInstance(
            DynDnsServerUserService,
            DynDnsServerUser,
            DynDnsServerUserService.REGISTER_NAME
        );
    }

    /**
     * Find entry by name.
     * @param {string} name
     * @returns {DynDnsServerUser | null}
     */
    public findByName(name: string): Promise<DynDnsServerUser | null> {
        return this._repository.findOne({
            where: {
                username: name
            }
        });
    }

    /**
     * Set last update for user entry.
     * @param {number} id
     * @returns {UpdateResult}
     */
    public async setLastUpdate(id: number): Promise<UpdateResult> {
        return this._repository
        .createQueryBuilder()
        .update()
        .set({
            last_update: DateHelper.getCurrentDbTime()
        })
        .where('id = :id', {id: id})
        .execute();
    }

}