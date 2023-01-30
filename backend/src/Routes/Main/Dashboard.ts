import {Get, JsonController, Session} from 'routing-controllers-extended';
import {HimHIP, HimHIPData} from '../../inc/HimHIP/HimHIP.js';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';
import {HowIsMyPublicIpService} from '../../inc/Service/HowIsMyPublicIpService.js';

/**
 * DashboardInfoResponse
 */
export type DashboardInfoResponse = DefaultReturn & {
    public_ip: string|null;
    host: HimHIPData|null;
};

/**
 * Dashboard
 */
@JsonController()
export class Dashboard {

    /**
     * getInfo
     */
    @Get('/json/dashboard/info')
    public async getInfo(@Session() session: any): Promise<DashboardInfoResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            return {
                public_ip: await HowIsMyPublicIpService.getInstance().getCurrentIp(),
                host: HimHIP.getData(),
                statusCode: StatusCodes.OK
            };
        }

        return {
            public_ip: null,
            host: null,
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}