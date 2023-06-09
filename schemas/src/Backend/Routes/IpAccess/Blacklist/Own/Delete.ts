import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaIpAccessBlackDeleteRequest
 */
export const SchemaIpAccessBlackDeleteRequest = Vts.object({
    id: Vts.number()
});

/**
 * IpAccessBlackDeleteRequest
 */
export type IpAccessBlackDeleteRequest = ExtractSchemaResultType<typeof SchemaIpAccessBlackDeleteRequest>;

/**
 * SchemaIpAccessBlackDeleteResponse
 */
export const SchemaIpAccessBlackDeleteResponse = SchemaDefaultReturn;

/**
 * IpAccessBlackDeleteResponse
 */
export type IpAccessBlackDeleteResponse = ExtractSchemaResultType<typeof SchemaIpAccessBlackDeleteResponse>;