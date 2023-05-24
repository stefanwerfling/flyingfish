import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../../../inc/Db/MariaDb/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../../../../../inc/Db/MariaDb/Entity/IpBlacklist.js';

/**
 * IpAccessBlackDeleteRequest
 */
export const SchemaIpAccessBlackDeleteRequest = Vts.object({
    id: Vts.number()
});

export type IpAccessBlackDeleteRequest = ExtractSchemaResultType<typeof SchemaIpAccessBlackDeleteRequest>;

/**
 * IpAccessBlackDeleteResponse
 */
export type IpAccessBlackDeleteResponse = DefaultReturn;

/**
 * Delete
 */
export class Delete {

    /**
     * deleteBlacklist
     * @param data
     */
    public static async deleteBlacklist(data: IpAccessBlackDeleteRequest): Promise<IpAccessBlackDeleteResponse> {
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

        const result = await ipBlacklistRepository.delete({
            id: data.id,
            is_imported: false
        });

        if (result) {
            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR
        };
    }

}