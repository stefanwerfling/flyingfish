import {IpBlacklistServiceDB} from 'flyingfish_core';
import {
    IpAccessBlackListOwn,
    IpAccessBlackListOwnsResponse,
    StatusCodes
} from 'flyingfish_schemas';
import {UtilsLocation} from '../../UtilsLocation.js';

/**
 * List
 */
export class List {

    /**
     * getBlackListOwns
     */
    public static async getBlackListOwns(): Promise<IpAccessBlackListOwnsResponse> {
        const entries = await IpBlacklistServiceDB.getInstance().findAllOwn('DESC');

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
                    disabled: entry.disabled,
                    last_update: entry.last_update,
                    last_block: entry.last_block,
                    count_block: entry.count_block,
                    ip_location_id: entry.ip_location_id,
                    description: entry.description ?? ''
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