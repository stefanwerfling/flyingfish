import {IpWhitelistServiceDB} from 'flyingfish_core';
import {IpAccessWhiteDeleteRequest, IpAccessWhiteDeleteResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * Delete
 */
export class Delete {

    /**
     * deleteWhitelist
     * @param data
     */
    public static async deleteWhitelist(data: IpAccessWhiteDeleteRequest): Promise<IpAccessWhiteDeleteResponse> {
        const result = await IpWhitelistServiceDB.getInstance().remove(data.id);

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