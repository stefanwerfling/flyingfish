import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaIpAccessBlackListOwnSaveRequest
 */
export const SchemaIpAccessBlackListOwnSaveRequest = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    disabled: Vts.boolean(),
    description: Vts.string()
});

/**
 * IpAccessBlackListOwnSaveRequest
 */
export type IpAccessBlackListOwnSaveRequest = ExtractSchemaResultType<typeof SchemaIpAccessBlackListOwnSaveRequest>;

/**
 * SchemaIpAccessBlackListOwnSaveResponse
 */
export const SchemaIpAccessBlackListOwnSaveResponse = SchemaDefaultReturn;

/**
 * IpAccessBlackListOwnSaveResponse
 */
export type IpAccessBlackListOwnSaveResponse = ExtractSchemaResultType<typeof SchemaIpAccessBlackListOwnSaveResponse>;