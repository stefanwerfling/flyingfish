import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * Schema Ssl List Wildcard request
 */
export const SchemaSslListWildcardRequest = Vts.object({
    domain_id: Vts.number()
});

/**
 * Ssl List Wildcard Request
 */
export type SslListWildcardRequest = ExtractSchemaResultType<typeof SchemaSslListWildcardRequest>;

/**
 * Schema Ssl List Wildcard Entry
 */
export const SchemaSslListWildcardEntry = Vts.object({
    owern_http_id: Vts.number(),
    label: Vts.string()
});

/**
 * Ssl List Wildcard Entry
 */
export type SslListWildcardEntry = ExtractSchemaResultType<typeof SchemaSslListWildcardEntry>;

/**
 * Schema Ssl List Wildcard Response
 */
export const SchemaSslListWildcardResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaSslListWildcardEntry))
});

/**
 * Ssl List Wildcard Response
 */
export type SslListWildcardResponse = ExtractSchemaResultType<typeof SchemaSslListWildcardResponse>;