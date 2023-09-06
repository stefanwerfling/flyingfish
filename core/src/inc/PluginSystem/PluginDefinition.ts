import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaPluginDefinition
 */
export const SchemaPluginDefinition = Vts.object({
    name: Vts.string(),
    description: Vts.string(),
    version: Vts.string(),
    author: Vts.string(),
    url: Vts.string(),
    main: Vts.string()
});

/**
 * PluginDefinition
 */
export type PluginDefinition = ExtractSchemaResultType<typeof SchemaPluginDefinition>;