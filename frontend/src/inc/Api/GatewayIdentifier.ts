import {
    GatewayIdentifierDelete,
    GatewayIdentifierEntry,
    SchemaDefaultReturn,
    SchemaGatewayIdentifierListResponse
} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch';

/**
 * GatewayIdentifier
 */
export class GatewayIdentifier {

    /**
     * getList
     */
    public static async getList(): Promise<GatewayIdentifierEntry[]> {
        const result = await NetFetch.getData('/json/gatewayidentifier/list', SchemaGatewayIdentifierListResponse);
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
            id
        };

        await NetFetch.postData('/json/gatewayidentifier/delete', request, SchemaDefaultReturn);
        return true;
    }

}