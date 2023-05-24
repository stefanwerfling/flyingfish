import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {GatewayIdentifier as GatewayIdentifierDB} from '../../../inc/Db/MariaDb/Entity/GatewayIdentifier.js';

/**
 * GatewayIdentifierEntry
 */
export const SchemaGatewayIdentifierEntry = Vts.object({
    id: Vts.number(),
    networkname: Vts.string(),
    mac_address: Vts.string(),
    address: Vts.string(),
    color: Vts.string()
});

export type GatewayIdentifierEntry = ExtractSchemaResultType<typeof SchemaGatewayIdentifierEntry>;

/**
 * GatewayIdentifierListResponse
 */
export type GatewayIdentifierListResponse = DefaultReturn & {
    data?: GatewayIdentifierEntry[];
};

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