import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaIpAccessWhiteSaveRequest
 */
export const SchemaIpAccessWhiteSaveRequest = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    disabled: Vts.boolean(),
    description: Vts.string()
});

/**
 * IpAccessWhiteSaveRequest
 */
export type IpAccessWhiteSaveRequest = ExtractSchemaResultType<typeof SchemaIpAccessWhiteSaveRequest>;

/**
 * SchemaIpAccessWhiteSaveResponse
 */
export const SchemaIpAccessWhiteSaveResponse = SchemaDefaultReturn;

/**
 * IpAccessWhiteSaveResponse
 */
export type IpAccessWhiteSaveResponse = ExtractSchemaResultType<typeof SchemaIpAccessWhiteSaveResponse>;