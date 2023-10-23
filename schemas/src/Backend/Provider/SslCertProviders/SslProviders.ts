import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaSslProvider
 */
export const SchemaSslProvider = Vts.object({
    name: Vts.string(),
    title: Vts.string()
});

/**
 * SslProvider
 */
export type SslProvider = ExtractSchemaResultType<typeof SchemaSslProvider>;