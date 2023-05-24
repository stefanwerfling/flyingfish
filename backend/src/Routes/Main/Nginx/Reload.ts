import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {NginxService} from '../../../inc/Service/NginxService.js';

/**
 * NginxReloadResponse
 */
export type NginxReloadResponse = DefaultReturn;

/**
 * Reload
 */
export class Reload {

    /**
     * reload
     */
    public static async reload(): Promise<NginxReloadResponse> {
        await NginxService.getInstance().reload();

        return {
            statusCode: StatusCodes.OK
        };
    }

}