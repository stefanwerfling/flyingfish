import {DefaultReturn, GatewayIdentifierDelete, StatusCodes} from 'flyingfish_schemas';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {GatewayIdentifier as GatewayIdentifierDB} from '../../../inc/Db/MariaDb/Entity/GatewayIdentifier.js';

/**
 * Delete
 */
export class Delete {

    /**
     * delete
     * @param data
     */
    public static async delete(data: GatewayIdentifierDelete): Promise<DefaultReturn> {
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