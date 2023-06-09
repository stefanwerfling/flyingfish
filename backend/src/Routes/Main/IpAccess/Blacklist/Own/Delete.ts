import {IpAccessBlackDeleteRequest, IpAccessBlackDeleteResponse, StatusCodes} from 'flyingfish_schemas';
import {DBHelper} from '../../../../../inc/Db/MariaDb/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../../../../../inc/Db/MariaDb/Entity/IpBlacklist.js';

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