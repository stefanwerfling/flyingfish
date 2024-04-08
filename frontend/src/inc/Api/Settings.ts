import {SchemaDefaultReturn, SchemaSettingsResponse, SettingsList} from 'flyingfish_schemas';
import {Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch';
import {UnknownResponse} from './Error/UnknownResponse';

/**
 * Settings
 */
export class Settings {

    /**
     * getSettings
     */
    public static async getSettings(): Promise<SettingsList> {
        const result = await NetFetch.getData('/json/settings/list', SchemaSettingsResponse);

        if (Vts.isUndefined(result.list)) {
            throw new UnknownResponse('Settings return empty list!');
        }

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