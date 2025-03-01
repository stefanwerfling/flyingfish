import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {SslCertService} from '../../../Service/SslCertService.js';

/**
 * Run
 */
export class Run {

    /**
     * Run service
     * @returns {DefaultReturn}
     */
    public static async rundService(): Promise<DefaultReturn> {
        if (SslCertService.getInstance().isInProcess()) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Scheduler is currently in process.'
            };
        }

        await SslCertService.getInstance().invokeUpdate();

        return {
            statusCode: StatusCodes.OK
        };
    }

}