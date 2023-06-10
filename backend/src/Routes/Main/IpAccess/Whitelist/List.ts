import {DBHelper} from 'flyingfish_core';
import {IpAccessWhiteList, IpAccessWhiteListResponse, StatusCodes} from 'flyingfish_schemas';
import {UtilsLocation} from '../UtilsLocation.js';
import {IpWhitelist as IpWhitelistDB} from '../../../../inc/Db/MariaDb/Entity/IpWhitelist.js';

/**
 * List
 */
export class List {

    /**
     * getWhiteList
     */
    public static async getWhiteList(): Promise<IpAccessWhiteListResponse> {
        const ipWhitelistRepository = DBHelper.getRepository(IpWhitelistDB);

        const entries = await ipWhitelistRepository.find({
            order: {
                last_access: 'DESC'
            }
        });

        const list: IpAccessWhiteList[] = [];
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
                    last_access: entry.last_access,
                    count_access: entry.count_access,
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