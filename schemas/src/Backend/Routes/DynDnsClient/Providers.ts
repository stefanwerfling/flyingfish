import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * DynDnsClientProvider
 */
export const SchemaDynDnsClientProvider = Vts.object({
    name: Vts.string(),
    title: Vts.string()
});

/**
 * DynDnsClientProvider
 */
export type DynDnsClientProvider = ExtractSchemaResultType<typeof SchemaDynDnsClientProvider>;

/**
 * DynDnsClientProviderListResponse
 */
export const SchemaDynDnsClientProviderListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaDynDnsClientProvider)
});

/**
 * DynDnsClientProviderListResponse
 */
export type DynDnsClientProviderListResponse = ExtractSchemaResultType<typeof SchemaDynDnsClientProviderListResponse>;