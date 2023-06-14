import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaSettingsList
 */
export const SchemaSettingsList = Vts.object({
    nginx: Vts.object({
        worker_connections: Vts.string(),
        resolver: Vts.string()
    }),
    blacklist: Vts.object({
        importer: Vts.string(),
        iplocate: Vts.string()
    })
});

/**
 * SettingsList
 */
export type SettingsList = ExtractSchemaResultType<typeof SchemaSettingsList>;

/**
 * SchemaSettingsResponse
 */
export const SchemaSettingsResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(SchemaSettingsList)
});

/**
 * SettingsResponse
 */
export type SettingsResponse = ExtractSchemaResultType<typeof SchemaSettingsResponse>;