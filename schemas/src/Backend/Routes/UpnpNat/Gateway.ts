import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaUpnpNatGatwayInfo
 */
export const SchemaUpnpNatGatwayInfo = Vts.object({
    gatway_address: Vts.string(),
    gatwaymac_address: Vts.string(),
    client_address: Vts.string()
});

/**
 * UpnpNatGatwayInfo
 */
export type UpnpNatGatwayInfo = ExtractSchemaResultType<typeof SchemaUpnpNatGatwayInfo>;

/**
 * SchemaUpnpNatCurrentGatwayInfoResponse
 */
export const SchemaUpnpNatCurrentGatwayInfoResponse = SchemaDefaultReturn.extend({
    data: Vts.optional(SchemaUpnpNatGatwayInfo)
});

/**
 * UpnpNatCurrentGatwayInfoResponse
 */
export type UpnpNatCurrentGatwayInfoResponse = ExtractSchemaResultType<typeof SchemaUpnpNatCurrentGatwayInfoResponse>;