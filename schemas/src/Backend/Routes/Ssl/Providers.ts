import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';
import {SchemaSslProvider} from '../../Provider/SslProviders.js';

/**
 * SchemaSslProvidersResponse
 */
export const SchemaSslProvidersResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaSslProvider)
});

/**
 * SslProvidersResponse
 */
export type SslProvidersResponse = ExtractSchemaResultType<typeof SchemaSslProvidersResponse>;