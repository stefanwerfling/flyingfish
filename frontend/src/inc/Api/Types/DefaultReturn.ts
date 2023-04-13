import {ExtractSchemaResultType, Vts} from 'vts';
import {StatusCodes} from '../Status/StatusCodes';

/**
 * DefaultReturn
 */
export const SchemaDefaultReturn = Vts.object({
    statusCode: Vts.or([Vts.number(), Vts.enum(StatusCodes)]),
    msg: Vts.optional(Vts.string())
});

export type DefaultReturn = ExtractSchemaResultType<typeof SchemaDefaultReturn>;