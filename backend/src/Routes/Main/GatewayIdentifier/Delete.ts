import {GatewayIdentifierServiceDB} from 'flyingfish_core';
import {DefaultReturn, GatewayIdentifierDelete, StatusCodes} from 'flyingfish_schemas';

/**
 * Delete Route for Gateway identifier.
 */
export class Delete {

    /**
     * Delete a Gateway identifier.
     * @param {GatewayIdentifierDelete} data - Delete data information from UI.
     */
    public static async delete(data: GatewayIdentifierDelete): Promise<DefaultReturn> {
        const result = await GatewayIdentifierServiceDB.getInstance().remove(data.id);

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