import {DBHelper} from 'flyingfish_core';
import {IpAccessBlackListImportSaveRequest, IpAccessBlackListImportSaveResponse, StatusCodes} from 'flyingfish_schemas';
import {IpBlacklist as IpBlacklistDB} from '../../../../../inc/Db/MariaDb/Entity/IpBlacklist.js';

/**
 * Save
 */
export class Save {

    /**
     * saveBlackListImport
     * @param request
     */
    public static async saveBlackListImport(request: IpAccessBlackListImportSaveRequest): Promise<IpAccessBlackListImportSaveResponse> {
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

        const entrie = await ipBlacklistRepository.findOne({
            where: {
                id: request.id,
                is_imported: true
            }
        });

        if (entrie) {
            entrie.disable = request.disable;

            await DBHelper.getDataSource().manager.save(entrie);

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: 'Entrie not found by id!'
        };
    }

}