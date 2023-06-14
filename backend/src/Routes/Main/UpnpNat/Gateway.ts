import {StatusCodes, UpnpNatCurrentGatwayInfoResponse} from 'flyingfish_schemas';
import {HimHIP} from '../../../inc/HimHIP/HimHIP.js';

/**
 * Gateway
 */
export class Gateway {

    /**
     * getCurrentGatewayInfo
     */
    public static async getCurrentGatewayInfo(): Promise<UpnpNatCurrentGatwayInfoResponse> {
        const himhip = HimHIP.getData();

        if (himhip !== null) {
            return {
                statusCode: StatusCodes.OK,
                data: {
                    gatway_address: himhip.gateway,
                    gatwaymac_address: himhip.gatewaymac,
                    client_address: himhip.hostip
                }
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR
        };
    }

}