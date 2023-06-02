import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {IpBlacklistCheck} from '../../../inc/Analysis/Ip/IpBlacklist.js';
import {IpService} from '../../../inc/Service/IpService.js';

/**
 * PublicIPBlacklistCheckResponse
 */
export type PublicIPBlacklistCheckResponse = DefaultReturn & {
    rbl: IpBlacklistCheck[];
};

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