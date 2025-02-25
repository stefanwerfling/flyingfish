import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaProviderEntry} from './ProviderEntry.js';

/**
 * Extend Provider ssl entry
 */
export const SchemaProviderSslEntry = SchemaProviderEntry.extend({
    options: Vts.object({
        wildcardSupported: Vts.boolean(),
        email_required: Vts.boolean()
    })
});

/**
 * Type of provider ssl entry
 */
export type ProviderSslEntry = ExtractSchemaResultType<typeof SchemaProviderSslEntry>;