import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {NginxHTTPVariables} from '../../../inc/Nginx/NginxVariables.js';

/**
 * SettingDefaults
 */
export type SettingDefaultsResponse = DefaultReturn & {
    http_variables: string[];
    http_server_variables: string[];
    http_location_variables: string[];
};

/**
 * SettingDefaults
 */
export class SettingDefaults {

    /**
     * getSettingDefaults
     */
    public static async getSettingDefaults(): Promise<SettingDefaultsResponse> {
        return {
            statusCode: StatusCodes.OK,
            http_variables: [],
            http_server_variables: [
                NginxHTTPVariables.client_max_body_size
            ],
            http_location_variables: []
        };
    }

}