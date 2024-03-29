import {
    IpBlacklistCategoryServiceDB,
    IpBlacklistMaintainerServiceDB,
    IpBlacklistServiceDB
} from 'flyingfish_core';
import {IpAccessBlackListImport, IpAccessBlackListImportsResponse, StatusCodes} from 'flyingfish_schemas';
import {UtilsLocation} from '../../UtilsLocation.js';

/**
 * List
 */
export class List {

    /**
     * getBlackList
     */
    public static async getBlackListImports(): Promise<IpAccessBlackListImportsResponse> {
        const limit = 20;

        const entries = await IpBlacklistServiceDB.getInstance().findAllImported(limit, 'DESC');

        const list: IpAccessBlackListImport[] = [];
        const locationIds: number[] = [];

        if (entries) {
            for await (const entry of entries) {
                const categorys: number[] = [];
                const maintainers: number[] = [];

                const cats = await IpBlacklistCategoryServiceDB.getInstance().findAllByIp(entry.id);

                if (cats) {
                    for (const cat of cats) {
                        categorys.push(cat.cat_num);
                    }
                }

                const maints = await IpBlacklistMaintainerServiceDB.getInstance().findAllByIp(entry.id);

                if (maints) {
                    for (const maint of maints) {
                        maintainers.push(maint.ip_maintainer_id);
                    }
                }

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
                    categorys: categorys,
                    maintainers: maintainers,
                    ip_location_id: entry.ip_location_id
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