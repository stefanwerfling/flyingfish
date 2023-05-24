import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../../../inc/Db/MariaDb/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../../../../../inc/Db/MariaDb/Entity/IpBlacklist.js';

/**
 * IpAccessBlackListImportSaveRequest
 */
export const SchemaIpAccessBlackListImportSaveRequest = Vts.object({
    id: Vts.number(),
    disable: Vts.boolean()
});

export type IpAccessBlackListImportSaveRequest = ExtractSchemaResultType<typeof SchemaIpAccessBlackListImportSaveRequest>;

/**
 * IpAccessBlackListImportSaveResponse
 */
export type IpAccessBlackListImportSaveResponse = DefaultReturn;

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