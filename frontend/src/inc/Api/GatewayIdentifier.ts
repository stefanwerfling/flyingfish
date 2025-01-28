import {
    GatewayIdentifierDelete,
    GatewayIdentifierEntry,
    SchemaDefaultReturn,
    SchemaGatewayIdentifierListResponse
} from 'flyingfish_schemas';
import {Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch.js';
import {UnknownResponse} from './Error/UnknownResponse.js';

/**
 * GatewayIdentifier
 */
export class GatewayIdentifier {

    /**
     * getList
     */
    public static async getList(): Promise<GatewayIdentifierEntry[]> {
        const result = await NetFetch.getData('/json/gatewayidentifier/list', SchemaGatewayIdentifierListResponse);

        if (Vts.isUndefined(result.data)) {
            throw new UnknownResponse('Gateway identifier return empty list!');
        }

        return result.data;
    }

    /**
     * save
     * @param gateway
     */
    public static async save(gateway: GatewayIdentifierEntry): Promise<boolean> {
        await NetFetch.postData('/json/gatewayidentifier/save', gateway, SchemaDefaultReturn);
        return true;
    }

    /**
     * delete
     * @param id
     */
    public static async delete(id: number): Promise<boolean> {
        const request: GatewayIdentifierDelete = {
            id: id
        };

        await NetFetch.postData('/json/gatewayidentifier/delete', request, SchemaDefaultReturn);
        return true;
    }

}