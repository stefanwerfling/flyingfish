import {SchemaPluginUiField} from 'figtree-schemas';
import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * One plugin as shown in the plugin list.
 */
export const SchemaPluginListEntry = Vts.object({
    name: Vts.string(),
    description: Vts.string(),
    version: Vts.string(),
    enabled: Vts.boolean(),
    loaded: Vts.boolean(),
    hasUi: Vts.boolean()
});

/**
 * PluginListEntry
 */
export type PluginListEntry = ExtractSchemaResultType<typeof SchemaPluginListEntry>;

/**
 * SchemaPluginListResponse
 */
export const SchemaPluginListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaPluginListEntry))
});

/**
 * PluginListResponse
 */
export type PluginListResponse = ExtractSchemaResultType<typeof SchemaPluginListResponse>;

/**
 * Request addressing a single plugin by its manifest name.
 */
export const SchemaPluginNameRequest = Vts.object({
    name: Vts.string()
});

/**
 * PluginNameRequest
 */
export type PluginNameRequest = ExtractSchemaResultType<typeof SchemaPluginNameRequest>;

/**
 * SchemaPluginUiResponse — a plugin's declarative UI field list plus its current
 * config values (values are plugin-specific, hence an open key/value map).
 */
export const SchemaPluginUiResponse = SchemaDefaultReturn.extend({
    ui: Vts.optional(Vts.array(SchemaPluginUiField)),
    data: Vts.optional(Vts.object2(Vts.string(), Vts.unknown()))
});

/**
 * PluginUiResponse
 */
export type PluginUiResponse = ExtractSchemaResultType<typeof SchemaPluginUiResponse>;

/**
 * Request to persist a plugin's config values.
 */
export const SchemaPluginDataSaveRequest = Vts.object({
    name: Vts.string(),
    data: Vts.object2(Vts.string(), Vts.unknown())
});

/**
 * PluginDataSaveRequest
 */
export type PluginDataSaveRequest = ExtractSchemaResultType<typeof SchemaPluginDataSaveRequest>;

/**
 * Request to enable or disable a plugin.
 */
export const SchemaPluginEnableRequest = Vts.object({
    name: Vts.string(),
    enabled: Vts.boolean()
});

/**
 * PluginEnableRequest
 */
export type PluginEnableRequest = ExtractSchemaResultType<typeof SchemaPluginEnableRequest>;
