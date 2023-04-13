import {ExtractSchemaResultType, Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch';
import {SchemaDefaultReturn} from './Types/DefaultReturn';

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
export const SchemaGatewayIdentifierListResponse = SchemaDefaultReturn.extend({
    data: Vts.optional(Vts.array(SchemaGatewayIdentifierEntry))
});

export type GatewayIdentifierListResponse = ExtractSchemaResultType<typeof SchemaGatewayIdentifierListResponse>;

/**
 * GatewayIdentifierSaveResponse
 */
export const SchemaGatewayIdentifierSaveResponse = SchemaDefaultReturn;
export type GatewayIdentifierSaveResponse = ExtractSchemaResultType<typeof SchemaGatewayIdentifierSaveResponse>;

/**
 * GatewayIdentifierDelete
 */
export const SchemaGatewayIdentifierDelete = Vts.object({
    id: Vts.number()
});

export type GatewayIdentifierDelete = ExtractSchemaResultType<typeof SchemaGatewayIdentifierDelete>;

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