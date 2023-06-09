import {ExtractSchemaResultType, Vts} from 'vts';
import {StatusCodes} from './StatusCodes.js';

/**
 * SchemaDefaultReturn
 */
export const SchemaDefaultReturn = Vts.object({
    statusCode: Vts.or([Vts.number(), Vts.enum(StatusCodes)]),
    msg: Vts.optional(Vts.string())
});

/**
 * DefaultReturn
 */
export type DefaultReturn = ExtractSchemaResultType<typeof SchemaDefaultReturn>;