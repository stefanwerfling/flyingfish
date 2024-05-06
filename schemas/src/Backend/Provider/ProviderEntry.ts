import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Schema of a Provider entry
 */
export const SchemaProviderEntry = Vts.object({
    name: Vts.string(),
    title: Vts.string()
});

/**
 * Type of Provider entry
 */
export type ProviderEntry = ExtractSchemaResultType<typeof SchemaProviderEntry>;