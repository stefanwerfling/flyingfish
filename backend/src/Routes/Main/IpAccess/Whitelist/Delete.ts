import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../../inc/Db/MariaDb/DBHelper.js';
import {IpWhitelist as IpWhitelistDB} from '../../../../inc/Db/MariaDb/Entity/IpWhitelist.js';

/**
 * IpAccessWhiteDeleteRequest
 */
export const SchemaIpAccessWhiteDeleteRequest = Vts.object({
    id: Vts.number()
});

export type IpAccessWhiteDeleteRequest = ExtractSchemaResultType<typeof SchemaIpAccessWhiteDeleteRequest>;

/**
 * IpAccessWhiteDeleteResponse
 */
export type IpAccessWhiteDeleteResponse = DefaultReturn;

/**
 * Delete
 */
export class Delete {

    /**
     * deleteWhitelist
     * @param data
     */
    public static async deleteWhitelist(data: IpAccessWhiteDeleteRequest): Promise<IpAccessWhiteDeleteResponse> {
        const ipWhitelistRepository = DBHelper.getRepository(IpWhitelistDB);

        const result = await ipWhitelistRepository.delete({
            id: data.id
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