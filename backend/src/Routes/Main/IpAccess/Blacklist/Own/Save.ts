import {DateHelper, DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../../../inc/Db/MariaDb/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../../../../../inc/Db/MariaDb/Entity/IpBlacklist.js';

/**
 * IpAccessBlackListOwnSaveRequest
 */
export const SchemaIpAccessBlackListOwnSaveRequest = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    disable: Vts.boolean(),
    description: Vts.string()
});

export type IpAccessBlackListOwnSaveRequest = ExtractSchemaResultType<typeof SchemaIpAccessBlackListOwnSaveRequest>;

/**
 * IpAccessBlackListOwnSaveResponse
 */
export type IpAccessBlackListOwnSaveResponse = DefaultReturn;

/**
 * Save
 */
export class Save {

    /**
     * saveBlackListOwn
     * @param data
     */
    public static async saveBlackListOwn(data: IpAccessBlackListOwnSaveRequest): Promise<IpAccessBlackListOwnSaveResponse> {
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

        let entrie = await ipBlacklistRepository.findOne({
            where: {
                id: data.id,
                is_imported: false
            }
        });

        if (!entrie) {
            entrie = new IpBlacklistDB();
        }

        entrie.ip = data.ip;
        entrie.disable = data.disable;
        entrie.description = data.description;
        entrie.is_imported = false;
        entrie.last_update = DateHelper.getCurrentDbTime();

        await DBHelper.getDataSource().manager.save(entrie);

        return {
            statusCode: StatusCodes.OK
        };
    }

}