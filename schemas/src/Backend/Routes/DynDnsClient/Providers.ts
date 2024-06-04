import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';
import {SchemaProviderEntry} from '../../Provider/ProviderEntry.js';

/**
 * DynDnsClientProviderListResponse
 */
export const SchemaDynDnsClientProviderListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaProviderEntry)
});

/**
 * DynDnsClientProviderListResponse
 */
export type DynDnsClientProviderListResponse = ExtractSchemaResultType<typeof SchemaDynDnsClientProviderListResponse>;