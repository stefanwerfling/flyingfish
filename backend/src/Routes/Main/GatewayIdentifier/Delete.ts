import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {GatewayIdentifier as GatewayIdentifierDB} from '../../../inc/Db/MariaDb/Entity/GatewayIdentifier.js';

/**
 * GatewayIdentifierDelete
 */
export const SchemaGatewayIdentifierDelete = Vts.object({
    id: Vts.number()
});

export type GatewayIdentifierDelete = ExtractSchemaResultType<typeof SchemaGatewayIdentifierDelete>;

/**
 * GatewayIdentifierDeleteResponse
 */
export type GatewayIdentifierDeleteResponse = DefaultReturn;

/**
 * Delete
 */
export class Delete {

    /**
     * delete
     * @param data
     */
    public static async delete(data: GatewayIdentifierDelete): Promise<GatewayIdentifierDeleteResponse> {
        const giRepository = DBHelper.getRepository(GatewayIdentifierDB);

        const result = await giRepository.delete({
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