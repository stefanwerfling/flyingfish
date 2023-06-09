import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

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

/**
 * GatewayIdentifierEntry
 */
export type GatewayIdentifierEntry = ExtractSchemaResultType<typeof SchemaGatewayIdentifierEntry>;

/**
 * GatewayIdentifierListResponse
 */
export const SchemaGatewayIdentifierListResponse = SchemaDefaultReturn.extend({
    data: Vts.optional(Vts.array(SchemaGatewayIdentifierEntry))
});

/**
 * GatewayIdentifierListResponse
 */
export type GatewayIdentifierListResponse = ExtractSchemaResultType<typeof SchemaGatewayIdentifierListResponse>;