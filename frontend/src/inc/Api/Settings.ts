import {ExtractSchemaResultType, Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch';
import {SchemaDefaultReturn} from './Types/DefaultReturn';

/**
 * SettingsList
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

export type SettingsList = ExtractSchemaResultType<typeof SchemaSettingsList>;

/**
 * SettingsResponse
 */
export const SchemaSettingsResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(SchemaSettingsList)
});

export type SettingsResponse = ExtractSchemaResultType<typeof SchemaSettingsResponse>;

/**
 * Settings
 */
export class Settings {

    /**
     * getSettings
     */
    public static async getSettings(): Promise<SettingsList> {
        const result = await NetFetch.getData('/json/settings/list', SchemaSettingsResponse);
        return result.list;
    }

    /**
     * saveSettings
     * @param settings
     */
    public static async saveSettings(settings: SettingsList): Promise<boolean> {
        await NetFetch.postData('/json/settings/save', settings, SchemaDefaultReturn);
        return true;
    }

}