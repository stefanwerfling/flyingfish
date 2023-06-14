import {SchemaDefaultReturn, SchemaSettingsResponse, SettingsList} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch';

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