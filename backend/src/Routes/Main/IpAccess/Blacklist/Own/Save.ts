import {DateHelper, DBHelper} from 'flyingfish_core';
import {IpAccessBlackListOwnSaveRequest, IpAccessBlackListOwnSaveResponse, StatusCodes} from 'flyingfish_schemas';
import {IpBlacklist as IpBlacklistDB} from '../../../../../inc/Db/MariaDb/Entity/IpBlacklist.js';

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