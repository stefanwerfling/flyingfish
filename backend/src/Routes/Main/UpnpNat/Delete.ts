import {NatPortServiceDB} from 'flyingfish_core';
import {DefaultReturn, StatusCodes, UpnpNatDeleteRequest} from 'flyingfish_schemas';

/**
 * Delete
 */
export class Delete {

    /**
     * delete
     * @param data
     */
    public static async delete(data: UpnpNatDeleteRequest): Promise<DefaultReturn> {
        const result = await NatPortServiceDB.getInstance().remove(data.id);

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