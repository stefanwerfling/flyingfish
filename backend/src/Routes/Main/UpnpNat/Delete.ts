import {DBHelper} from 'flyingfish_core';
import {DefaultReturn, StatusCodes, UpnpNatDeleteRequest} from 'flyingfish_schemas';
import {NatPort as NatPortDB} from '../../../inc/Db/MariaDb/Entity/NatPort.js';

/**
 * Delete
 */
export class Delete {

    /**
     * delete
     * @param data
     */
    public static async delete(data: UpnpNatDeleteRequest): Promise<DefaultReturn> {
        const natportRepository = DBHelper.getRepository(NatPortDB);

        const result = await natportRepository.delete({
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