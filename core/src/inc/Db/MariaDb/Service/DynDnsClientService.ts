import {DateHelper} from '../../../Utils/DateHelper.js';
import {DBService} from '../DBService.js';
import {DynDnsClient} from '../Entity/DynDnsClient.js';

/**
 * DynDnsClientService
 */
export class DynDnsClientService extends DBService<DynDnsClient> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'dyndns_client';

    /**
     * getInstance
     */
    public static getInstance(): DynDnsClientService {
        return DBService.getSingleInstance(
            DynDnsClientService,
            DynDnsClient,
            DynDnsClientService.REGISTER_NAME
        );
    }

    /**
     * updateStatus
     * @param id
     * @param status
     */
    public async updateStatus(id: number, status: number): Promise<void> {
        await this._repository
        .createQueryBuilder()
        .update()
        .set({
            last_status: status,
            last_update: DateHelper.getCurrentDbTime()
        })
        .where('id = :id', {id: id})
        .execute();
    }

}