import {
    IpAccessBlackListOwn,
    IpAccessBlackListOwnsResponse,
    StatusCodes
} from 'flyingfish_schemas';
import {DBHelper} from '../../../../../inc/Db/MariaDb/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../../../../../inc/Db/MariaDb/Entity/IpBlacklist.js';
import {UtilsLocation} from '../../UtilsLocation.js';

/**
 * List
 */
export class List {

    /**
     * getBlackListOwns
     */
    public static async getBlackListOwns(): Promise<IpAccessBlackListOwnsResponse> {
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

        const entries = await ipBlacklistRepository.find({
            where: {
                is_imported: false
            },
            order: {
                last_block: 'DESC'
            }
        });

        const list: IpAccessBlackListOwn[] = [];
        const locationIds: number[] = [];

        if (entries) {
            for await (const entry of entries) {
                if (entry.ip_location_id !== 0) {
                    locationIds.push(entry.ip_location_id);
                }

                list.push({
                    id: entry.id,
                    ip: entry.ip,
                    disable: entry.disable,
                    last_update: entry.last_update,
                    last_block: entry.last_block,
                    count_block: entry.count_block,
                    ip_location_id: entry.ip_location_id,
                    description: entry.description
                });
            }
        }

        return {
            statusCode: StatusCodes.OK,
            list: list,
            locations: await UtilsLocation.getLocations(locationIds)
        };
    }

}