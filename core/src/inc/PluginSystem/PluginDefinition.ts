import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * PluginDefinition
 */
export const SchemaPluginDefinition = Vts.object({
    name: Vts.string(),
    description: Vts.string(),
    version: Vts.string(),
    author: Vts.string(),
    url: Vts.string(),
    main: Vts.string()
});

export type PluginDefinition = ExtractSchemaResultType<typeof SchemaPluginDefinition>;
