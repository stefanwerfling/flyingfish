import {GatewayIdentifierServiceDB} from 'flyingfish_core';
import {GatewayIdentifierEntry, GatewayIdentifierListResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * List
 */
export class List {

    /**
     * getList
     */
    public static async getList(): Promise<GatewayIdentifierListResponse> {
        const list: GatewayIdentifierEntry[] = [];
        const entries = await GatewayIdentifierServiceDB.getInstance().findAll();

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