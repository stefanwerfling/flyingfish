import {PublicIPBlacklistCheckResponse, StatusCodes} from 'flyingfish_schemas';
import {IpService} from '../../../Service/IpService.js';

/**
 * PublicIPBlacklistCheck
 */
export class PublicIPBlacklistCheck {

    /**
     * check
     */
    public static async check(): Promise<PublicIPBlacklistCheckResponse> {
        await IpService.getInstance().check();
        const rblList = IpService.foundOnRBL;

        return {
            statusCode: StatusCodes.OK,
            rbl: rblList
        };
    }

}