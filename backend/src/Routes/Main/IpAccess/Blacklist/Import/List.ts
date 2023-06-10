import {DBHelper} from 'flyingfish_core';
import {IpAccessBlackListImport, IpAccessBlackListImportsResponse, StatusCodes} from 'flyingfish_schemas';
import {UtilsLocation} from '../../UtilsLocation.js';
import {IpBlacklist as IpBlacklistDB} from '../../../../../inc/Db/MariaDb/Entity/IpBlacklist.js';
import {IpBlacklistCategory as IpBlacklistCategoryDB} from '../../../../../inc/Db/MariaDb/Entity/IpBlacklistCategory.js';
import {IpBlacklistMaintainer as IpBlacklistMaintainerDB} from '../../../../../inc/Db/MariaDb/Entity/IpBlacklistMaintainer.js';

/**
 * List
 */
export class List {

    /**
     * getBlackList
     */
    public static async getBlackListImports(): Promise<IpAccessBlackListImportsResponse> {
        const limit = 20;

        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);
        const ipBlacklistCategoryRepository = DBHelper.getRepository(IpBlacklistCategoryDB);
        const ipBlacklistMaintainerRepository = DBHelper.getRepository(IpBlacklistMaintainerDB);

        const entries = await ipBlacklistRepository.find({
            take: limit,
            where: {
                is_imported: true
            },
            order: {
                last_block: 'DESC'
            }
        });

        const list: IpAccessBlackListImport[] = [];
        const locationIds: number[] = [];

        if (entries) {
            for await (const entry of entries) {
                const categorys: number[] = [];
                const maintainers: number[] = [];

                const cats = await ipBlacklistCategoryRepository.find({
                    where: {
                        ip_id: entry.id
                    }
                });

                if (cats) {
                    for (const cat of cats) {
                        categorys.push(cat.cat_num);
                    }
                }

                const maints = await ipBlacklistMaintainerRepository.find({
                    where: {
                        ip_id: entry.id
                    }
                });

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
                    disable: entry.disable,
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