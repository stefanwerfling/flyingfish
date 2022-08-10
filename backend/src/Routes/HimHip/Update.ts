import {Response} from 'express';
import {Get, HeaderParam, JsonController, Res} from 'routing-controllers';
import {Config} from '../../inc/Config/Config';
import {HimHIP} from '../../inc/HimHIP/HimHIP';

/**
 * Update
 */
@JsonController()
export class Update {

    @Get('/himhip/update')
    public async update(
        @Res() response: Response,
        @HeaderParam('secure') secure: string,
        @HeaderParam('gatewaymac') gatewaymac: string,
        @HeaderParam('network') network: string,
        @HeaderParam('gateway') gateway: string,
        @HeaderParam('interface') tinterface: string,
        @HeaderParam('hostip') hostip: string
    ): Promise<boolean> {
        const configHimHip = Config.get()?.himhip;

        if (configHimHip && configHimHip.use) {
            if (configHimHip.secure === secure) {
                HimHIP.setData({
                    gatewaymac,
                    network,
                    gateway,
                    interface: tinterface,
                    hostip
                });

                response.status(200);
                return true;
            }
        }

        response.status(401);
        return false;
    }

}