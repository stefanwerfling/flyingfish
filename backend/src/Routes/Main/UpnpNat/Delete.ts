import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {NatPort as NatPortDB} from '../../../inc/Db/MariaDb/Entity/NatPort.js';

/**
 * UpnpNatDeleteRequest
 */
export const SchemaUpnpNatDeleteRequest = Vts.object({
    id: Vts.number()
});

export type UpnpNatDeleteRequest = ExtractSchemaResultType<typeof SchemaUpnpNatDeleteRequest>;

/**
 * UpnpNatDeleteResponse
 */
export type UpnpNatDeleteResponse = DefaultReturn;

/**
 * Delete
 */
export class Delete {

    /**
     * delete
     * @param data
     */
    public static async delete(data: UpnpNatDeleteRequest): Promise<UpnpNatDeleteResponse> {
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