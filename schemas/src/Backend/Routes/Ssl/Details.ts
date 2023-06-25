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
 * SchemaSslDetailInfoData
 */
export const SchemaSslDetailInfoData = Vts.object({
    key: Vts.string(),
    value: Vts.string()
});

/**
 * SslDetailInfoData
 */
export type SslDetailInfoData = ExtractSchemaResultType<typeof SchemaSslDetailInfoData>;

/**
 * SchemaSslDetails
 */
export const SchemaSslDetails = Vts.object({
    issuer: Vts.array(SchemaSslDetailInfoData),
    subject: Vts.array(SchemaSslDetailInfoData),
    serialNumber: Vts.string(),
    dateNotBefore: Vts.string(),
    dateNotAfter: Vts.string(),
    signatureAlgorithm: Vts.string(),
    extensions: Vts.array(Vts.string())
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