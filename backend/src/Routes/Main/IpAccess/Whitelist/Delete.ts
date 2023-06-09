import {IpAccessWhiteDeleteRequest, IpAccessWhiteDeleteResponse, StatusCodes} from 'flyingfish_schemas';
import {DBHelper} from '../../../../inc/Db/MariaDb/DBHelper.js';
import {IpWhitelist as IpWhitelistDB} from '../../../../inc/Db/MariaDb/Entity/IpWhitelist.js';

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