import {IpBlacklistServiceDB} from 'flyingfish_core';
import {IpAccessBlackDeleteRequest, IpAccessBlackDeleteResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * Delete
 */
export class Delete {

    /**
     * deleteBlacklist
     * @param data
     */
    public static async deleteBlacklist(data: IpAccessBlackDeleteRequest): Promise<IpAccessBlackDeleteResponse> {
        const result = await IpBlacklistServiceDB.getInstance().removeOwn(data.id);

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