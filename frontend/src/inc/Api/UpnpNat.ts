import {
    SchemaDefaultReturn,
    SchemaUpnpNatCurrentGatwayInfoResponse, SchemaUpnpNatResponse,
    UpnpNatDeleteRequest,
    UpnpNatGatwayInfo, UpnpNatPort, UpnpNatSaveRequest
} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch';

/**
 * NatStatuts
 */
export enum NatStatus {
    inactive,
    ok,
    error
}

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