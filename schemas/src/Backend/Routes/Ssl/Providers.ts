import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';
import {SchemaProviderSslEntry} from '../../Provider/ProviderSslEntry.js';

/**
 * SchemaSslProvidersResponse
 */
export const SchemaSslProvidersResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaProviderSslEntry)
});

/**
 * SslProvidersResponse
 */
export type SslProvidersResponse = ExtractSchemaResultType<typeof SchemaSslProvidersResponse>;