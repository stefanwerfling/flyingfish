import {GatewayIdentifierDB, GatewayIdentifierServiceDB} from 'flyingfish_core';
import {GatewayIdentifierEntry, GatewayIdentifierSaveResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * Save
 */
export class Save {

    /**
     * save
     * @param data
     */
    public static async save(data: GatewayIdentifierEntry): Promise<GatewayIdentifierSaveResponse> {
        let aGateway: GatewayIdentifierDB|null = null;

        if (data.id !== 0) {
            const tgi = await GatewayIdentifierServiceDB.getInstance().findOne(data.id);

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

        const result = await GatewayIdentifierServiceDB.getInstance().save(aGateway);

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