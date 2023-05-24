import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../../../inc/Db/MariaDb/DBHelper.js';
import {IpAccessLocation, UtilsLocation} from '../../UtilsLocation.js';
import {IpBlacklist as IpBlacklistDB} from '../../../../../inc/Db/MariaDb/Entity/IpBlacklist.js';
import {IpBlacklistCategory as IpBlacklistCategoryDB} from '../../../../../inc/Db/MariaDb/Entity/IpBlacklistCategory.js';
import {IpBlacklistMaintainer as IpBlacklistMaintainerDB} from '../../../../../inc/Db/MariaDb/Entity/IpBlacklistMaintainer.js';

/**
 * IpAccessBlackListImport
 */
export const SchemaIpAccessBlackListImport = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    last_update: Vts.number(),
    disable: Vts.boolean(),
    last_block: Vts.number(),
    count_block: Vts.number(),
    categorys: Vts.array(Vts.number()),
    maintainers: Vts.array(Vts.number()),
    ip_location_id: Vts.optional(Vts.number())
});

export type IpAccessBlackListImport = ExtractSchemaResultType<typeof SchemaIpAccessBlackListImport>;

/**
 * IpAccessBlackListImportsResponse
 */
export type IpAccessBlackListImportsResponse = DefaultReturn & {
    list?: IpAccessBlackListImport[];
    locations?: IpAccessLocation[];
};

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