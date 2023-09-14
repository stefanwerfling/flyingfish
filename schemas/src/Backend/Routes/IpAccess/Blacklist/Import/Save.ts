import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../../../Core/Server/Routes/DefaultReturn.js';

/**
 * IpAccessBlackListImportSaveRequest
 */
export const SchemaIpAccessBlackListImportSaveRequest = Vts.object({
    id: Vts.number(),
    disabled: Vts.boolean()
});

/**
 * IpAccessBlackListImportSaveRequest
 */
export type IpAccessBlackListImportSaveRequest = ExtractSchemaResultType<typeof SchemaIpAccessBlackListImportSaveRequest>;

/**
 * IpAccessBlackListImportSaveResponse
 */
export const SchemaIpAccessBlackListImportSaveResponse = SchemaDefaultReturn;

/**
 * IpAccessBlackListImportSaveResponse
 */
export type IpAccessBlackListImportSaveResponse = ExtractSchemaResultType<typeof SchemaIpAccessBlackListImportSaveResponse>;