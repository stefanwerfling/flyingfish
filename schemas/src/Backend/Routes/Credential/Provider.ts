import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';
import {SchemaProviderEntry} from '../../Provider/ProviderEntry.js';

/**
 * Schema of a credential provider list
 */
export const SchemaCredentialProviderResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaProviderEntry)
});

/**
 * Type of credential provider list
 */
export type CredentialProviderResponse = ExtractSchemaResultType<typeof SchemaCredentialProviderResponse>;