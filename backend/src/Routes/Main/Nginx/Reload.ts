import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {NginxService} from '../../../Service/NginxService.js';

/**
 * Reload
 */
export class Reload {

    /**
     * reload
     */
    public static async reload(): Promise<DefaultReturn> {
        await NginxService.getInstance().reload();

        return {
            statusCode: StatusCodes.OK
        };
    }

}