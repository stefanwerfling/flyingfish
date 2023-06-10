import {DBHelper} from 'flyingfish_core';
import {GatewayIdentifierEntry, GatewayIdentifierListResponse, StatusCodes} from 'flyingfish_schemas';
import {GatewayIdentifier as GatewayIdentifierDB} from '../../../inc/Db/MariaDb/Entity/GatewayIdentifier.js';

/**
 * List
 */
export class List {

    /**
     * getList
     */
    public static async getList(): Promise<GatewayIdentifierListResponse> {
        const giRepository = DBHelper.getRepository(GatewayIdentifierDB);

        const list: GatewayIdentifierEntry[] = [];
        const entries = await giRepository.find();

        for (const entry of entries) {
            list.push({
                id: entry.id,
                networkname: entry.networkname,
                mac_address: entry.mac_address,
                address: entry.address,
                color: entry.color
            });
        }

        return {
            statusCode: StatusCodes.OK,
            data: list
        };
    }

}