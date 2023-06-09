import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaStreamRequestPoint
 */
export const SchemaStreamRequestPoint = Vts.object({
    counts: Vts.number(),
    time: Vts.string()
});

/**
 * StreamRequestPoint
 */
export type StreamRequestPoint = ExtractSchemaResultType<typeof SchemaStreamRequestPoint>;

/**
 * SchemaStreamRequestsResponse
 */
export const SchemaStreamRequestsResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaStreamRequestPoint)
});

/**
 * StreamRequestsResponse
 */
export type StreamRequestsResponse = ExtractSchemaResultType<typeof SchemaStreamRequestsResponse>;