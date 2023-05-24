import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {HimHIP} from '../../../inc/HimHIP/HimHIP.js';

/**
 * UpnpNatGatwayInfo
 */
export const SchemaUpnpNatGatwayInfo = Vts.object({
    gatway_address: Vts.string(),
    gatwaymac_address: Vts.string(),
    client_address: Vts.string()
});

export type UpnpNatGatwayInfo = ExtractSchemaResultType<typeof SchemaUpnpNatGatwayInfo>;

/**
 * UpnpNatCurrentGatwayInfoResponse
 */
export type UpnpNatCurrentGatwayInfoResponse = DefaultReturn & {
    data?: UpnpNatGatwayInfo;
};

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