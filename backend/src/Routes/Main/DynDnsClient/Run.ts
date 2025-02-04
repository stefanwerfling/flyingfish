import {DefaultReturn, DynDnsClientDomainRunRequest, StatusCodes} from 'flyingfish_schemas';
import {DynDnsService} from '../../../Service/DynDnsService.js';

/**
 * Run
 */
export class Run {

    /**
     * Run a client sync for dynDns
     * @param {DynDnsClientDomainRunRequest} req
     * @returns {DefaultReturn}
     */
    public static async runClient(req: DynDnsClientDomainRunRequest): Promise<DefaultReturn> {
        if (DynDnsService.getInstance().isInProcess()) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Scheduler is currently in process.'
            };
        }

        await DynDnsService.getInstance().updateDns(req.client.id);

        return {
            statusCode: StatusCodes.OK
        };
    }

    /**
     * Run service
     * @returns {DefaultReturn}
     */
    public static async rundService(): Promise<DefaultReturn> {
        if (DynDnsService.getInstance().isInProcess()) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Scheduler is currently in process.'
            };
        }

        await DynDnsService.getInstance().invokeUpdate();

        return {
            statusCode: StatusCodes.OK
        };
    }

}