import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * SettingsList
 */
export type SettingsList = {
    nginx: {
        worker_connections: string;
        resolver: string;
    };
    blacklist: {
        importer: string;
        iplocate: string;
    };
};

/**
 * SettingsResponse
 */
export type SettingsResponse = DefaultReturn & {
    list?: SettingsList;
};

/**
 * Settings
 */
export class Settings {

    /**
     * getSettings
     */
    public static async getSettings(): Promise<SettingsList|null> {
        const result = await NetFetch.getData('/json/settings/list');

        if (result && result.statusCode) {
            const resultcontent = result as SettingsResponse;

            switch (resultcontent.statusCode) {
                case StatusCodes.OK:
                    return resultcontent.list!;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * saveSettings
     * @param settings
     */
    public static async saveSettings(settings: SettingsList): Promise<boolean> {
        const result = await NetFetch.postData('/json/settings/save', settings);

        return !!result;
    }
}