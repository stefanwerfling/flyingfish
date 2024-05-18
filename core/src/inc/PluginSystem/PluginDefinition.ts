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
    main: Vts.string(),
    main_directory: Vts.optional(Vts.array(Vts.string()))
});

/**
 * PluginDefinition
 */
export type PluginDefinition = ExtractSchemaResultType<typeof SchemaPluginDefinition>;