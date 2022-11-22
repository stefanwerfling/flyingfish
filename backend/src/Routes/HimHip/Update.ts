import {Response} from 'express';
import {Get, HeaderParam, JsonController, Res} from 'routing-controllers-extended';
import {Config} from '../../inc/Config/Config.js';
import {HimHIP} from '../../inc/HimHIP/HimHIP.js';

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
                    gatewaymac: gatewaymac,
                    network: network,
                    gateway: gateway,
                    interface: tinterface,
                    hostip: hostip
                });

                response.status(200);
                return true;
            }
        }

        response.status(401);
        return false;
    }

}