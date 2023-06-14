import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaSslDetailsRequest
 */
export const SchemaSslDetailsRequest = Vts.object({
    httpid: Vts.number()
});

/**
 * SslDetailsRequest
 */
export type SslDetailsRequest = ExtractSchemaResultType<typeof SchemaSslDetailsRequest>;

/**
 * SchemaSslDetails
 */
export const SchemaSslDetails = Vts.object({
    serialNumber: Vts.string(),
    dateNotBefore: Vts.string(),
    dateNotAfter: Vts.string()
});

/**
 * SslDetails
 */
export type SslDetails = ExtractSchemaResultType<typeof SchemaSslDetails>;

/**
 * SchemaSslDetailsResponse
 */
export const SchemaSslDetailsResponse = SchemaDefaultReturn.extend({
    details: Vts.optional(SchemaSslDetails)
});

/**
 * SslDetailsResponse
 */
export type SslDetailsResponse = ExtractSchemaResultType<typeof SchemaSslDetailsResponse>;