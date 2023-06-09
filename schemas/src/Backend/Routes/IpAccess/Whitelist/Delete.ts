import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaIpAccessWhiteDeleteRequest
 */
export const SchemaIpAccessWhiteDeleteRequest = Vts.object({
    id: Vts.number()
});

/**
 * IpAccessWhiteDeleteRequest
 */
export type IpAccessWhiteDeleteRequest = ExtractSchemaResultType<typeof SchemaIpAccessWhiteDeleteRequest>;

/**
 * SchemaIpAccessWhiteDeleteResponse
 */
export const SchemaIpAccessWhiteDeleteResponse = SchemaDefaultReturn;

/**
 * IpAccessWhiteDeleteResponse
 */
export type IpAccessWhiteDeleteResponse = ExtractSchemaResultType<typeof SchemaIpAccessWhiteDeleteResponse>;