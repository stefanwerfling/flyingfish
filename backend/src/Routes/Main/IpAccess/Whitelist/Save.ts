import {DateHelper} from 'flyingfish_core';
import {IpAccessWhiteSaveRequest, IpAccessWhiteSaveResponse, StatusCodes} from 'flyingfish_schemas';
import {DBHelper} from '../../../../inc/Db/MariaDb/DBHelper.js';
import {IpWhitelist as IpWhitelistDB} from '../../../../inc/Db/MariaDb/Entity/IpWhitelist.js';

/**
 * Save
 */
export class Save {

    /**
     * saveWhiteList
     * @param data
     */
    public static async saveWhiteList(data: IpAccessWhiteSaveRequest): Promise<IpAccessWhiteSaveResponse> {
        const ipWhitelistRepository = DBHelper.getRepository(IpWhitelistDB);

        let entrie = await ipWhitelistRepository.findOne({
            where: {
                id: data.id
            }
        });

        if (!entrie) {
            entrie = new IpWhitelistDB();
        }

        entrie.ip = data.ip;
        entrie.disable = data.disable;
        entrie.description = data.description;
        entrie.last_update = DateHelper.getCurrentDbTime();

        await DBHelper.getDataSource().manager.save(entrie);

        return {
            statusCode: StatusCodes.OK
        };
    }

}