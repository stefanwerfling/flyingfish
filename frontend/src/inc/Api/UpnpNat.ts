import {ExtractSchemaResultType, Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch';
import {SchemaDefaultReturn} from './Types/DefaultReturn';

/**
 * NatStatuts
 */
export enum NatStatus {
    inactive,
    ok,
    error
}

/**
 * UpnpNatCacheMapping
 */
export const SchemaUpnpNatCacheMapping = Vts.object({
    public: Vts.object({
        gateway: Vts.string(),
        host: Vts.string(),
        port: Vts.number()
    }),
    private: Vts.object({
        host: Vts.string(),
        port: Vts.number()
    }),
    protocol: Vts.string(),
    enabled: Vts.boolean(),
    description: Vts.string(),
    ttl: Vts.number(),
    local: Vts.boolean()
});

export type UpnpNatCacheMapping = ExtractSchemaResultType<typeof SchemaUpnpNatCacheMapping>;

/**
 * UpnpNatDevice
 */
export const SchemaUpnpNatDevice = Vts.object({
    deviceId: Vts.string(),
    mappings: Vts.array(SchemaUpnpNatCacheMapping)
});

export type UpnpNatDevice = ExtractSchemaResultType<typeof SchemaUpnpNatDevice>;

/**
 * UpnpNatPort
 */
export const SchemaUpnpNatPort = Vts.object({
    id: Vts.number(),
    postion: Vts.number(),
    public_port: Vts.number(),
    gateway_identifier_id: Vts.number(),
    gateway_address: Vts.string(),
    private_port: Vts.number(),
    client_address: Vts.string(),
    use_himhip_host_address: Vts.boolean(),
    ttl: Vts.number(),
    protocol: Vts.string(),
    last_ttl_update: Vts.number(),
    listen_id: Vts.number(),
    description: Vts.string(),
    last_status: Vts.number(),
    last_update: Vts.number()
});

export type UpnpNatPort = ExtractSchemaResultType<typeof SchemaUpnpNatPort>;

/**
 * UpnpNatResponse
 */
export const SchemaUpnpNatResponse = SchemaDefaultReturn.extend({
    data: Vts.array(SchemaUpnpNatPort)
});

export type UpnpNatResponse = ExtractSchemaResultType<typeof SchemaUpnpNatResponse>;

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
export const SchemaUpnpNatCurrentGatwayInfoResponse = SchemaDefaultReturn.extend({
    data: Vts.optional(SchemaUpnpNatGatwayInfo)
});

export type UpnpNatCurrentGatwayInfoResponse = ExtractSchemaResultType<typeof SchemaUpnpNatCurrentGatwayInfoResponse>;

/**
 * UpnpNatSaveRequest
 */
export type UpnpNatSaveRequest = UpnpNatPort;

/**
 * UpnpNatDeleteRequest
 */
export type UpnpNatDeleteRequest = {
    id: number;
};

/**
 * UpnpNat
 */
export class UpnpNat {

    /**
     * getList
     */
    public static async getList(): Promise<UpnpNatPort[]> {
        const result = await NetFetch.getData('/json/upnpnat/list', SchemaUpnpNatResponse);
        return result.data;
    }

    /**
     * getCurrentGatewayInfo
     */
    public static async getCurrentGatewayInfo(): Promise<UpnpNatGatwayInfo> {
        const result = await NetFetch.getData('/json/upnpnat/current_gateway_info', SchemaUpnpNatCurrentGatwayInfoResponse);
        return result.data;
    }

    /**
     * save
     * @param upnpnat
     */
    public static async save(upnpnat: UpnpNatSaveRequest): Promise<boolean> {
        await NetFetch.postData('/json/upnpnat/save', upnpnat, SchemaDefaultReturn);
        return true;
    }

    /**
     * delete
     * @param id
     */
    public static async delete(id: number): Promise<boolean> {
        const request: UpnpNatDeleteRequest = {
            id
        };

        await NetFetch.postData('/json/upnpnat/delete', request, SchemaDefaultReturn);
        return true;
    }

}