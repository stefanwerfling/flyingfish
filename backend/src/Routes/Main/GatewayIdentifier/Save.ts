import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {GatewayIdentifierEntry} from './List.js';
import {GatewayIdentifier as GatewayIdentifierDB} from '../../../inc/Db/MariaDb/Entity/GatewayIdentifier.js';

/**
 * GatewayIdentifierSaveResponse
 */
export type GatewayIdentifierSaveResponse = DefaultReturn;

/**
 * Save
 */
export class Save {

    /**
     * save
     * @param data
     */
    public static async save(data: GatewayIdentifierEntry): Promise<GatewayIdentifierSaveResponse> {
        const giRepository = DBHelper.getRepository(GatewayIdentifierDB);

        let aGateway: GatewayIdentifierDB|null = null;

        if (data.id !== 0) {
            const tgi = await giRepository.findOne({
                where: {
                    id: data.id
                }
            });

            if (tgi) {
                aGateway = tgi;
            }
        }

        if (aGateway === null) {
            aGateway = new GatewayIdentifierDB();
        }

        aGateway.mac_address = data.mac_address;
        aGateway.address = data.address;
        aGateway.networkname = data.networkname;
        aGateway.color = data.color;

        const result = await DBHelper.getDataSource().manager.save(aGateway);

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