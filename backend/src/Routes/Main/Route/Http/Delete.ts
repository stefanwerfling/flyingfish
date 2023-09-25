import {DBHelper, NginxHttpServiceDB} from 'flyingfish_core';
import {DefaultReturn, RouteHttpDelete, StatusCodes} from 'flyingfish_schemas';
import {NginxLocation as NginxLocationDB} from '../../../../inc/Db/MariaDb/Entity/NginxLocation.js';

/**
 * DeleteHttp
 */
export class Delete {

    /**
     * deleteHttpRoute
     * @param data
     */
    public static async deleteHttpRoute(data: RouteHttpDelete): Promise<DefaultReturn> {
        if (data.id === 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'id is null!'
            };
        }

        const locationRepository = DBHelper.getRepository(NginxLocationDB);

        const http = await NginxHttpServiceDB.getInstance().findOne(data.id);

        if (http) {
            await locationRepository.delete({
                http_id: http.id
            });

            const result = await NginxHttpServiceDB.getInstance().remove(http.id);

            if (result) {
                return {
                    statusCode: StatusCodes.OK
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: `http route can not delete by id: ${data.id}`
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: `http route not found by id: ${data.id}`
        };
    }

}