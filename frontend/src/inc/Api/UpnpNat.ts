import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

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
export type UpnpNatCacheMapping = {
    public: {
        gateway: string;
        host: string;
        port: number;
    };
    private: {
        host: string;
        port: number;
    };
    protocol: string;
    enabled: boolean;
    description: string;
    ttl: number;
    local: boolean;
};

/**
 * UpnpNatDevice
 */
export type UpnpNatDevice = {
    deviceId: string;
    mappings: UpnpNatCacheMapping[];
};

/**
 * UpnpNatPort
 */
export type UpnpNatPort = {
    id: number;
    postion: number;
    public_port: number;
    gateway_identifier_id: number;
    gateway_address: string;
    private_port: number;
    client_address: string;
    use_himhip_host_address: boolean;
    ttl: number;
    protocol: string;
    last_ttl_update: number;
    listen_id: number;
    description: string;
    last_status: number;
    last_update: number;
};

/**
 * UpnpNatResponse
 */
export type UpnpNatResponse = DefaultReturn & {
    data: UpnpNatPort[];
};

/**
 * UpnpNatGatwayInfo
 */
export type UpnpNatGatwayInfo = {
    gatway_address: string;
    gatwaymac_address: string;
    client_address: string;
};

/**
 * UpnpNatCurrentGatwayInfoResponse
 */
export type UpnpNatCurrentGatwayInfoResponse = DefaultReturn & {
    data?: UpnpNatGatwayInfo;
};

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
    public static async getList(): Promise<UpnpNatPort[] | null> {
        const result = await NetFetch.getData('/json/upnpnat/list');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result.data as UpnpNatPort[];

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * getCurrentGatewayInfo
     */
    public static async getCurrentGatewayInfo(): Promise<UpnpNatGatwayInfo | null> {
        const result = await NetFetch.getData('/json/upnpnat/current_gateway_info');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result.data as UpnpNatGatwayInfo;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * save
     * @param upnpnat
     */
    public static async save(upnpnat: UpnpNatSaveRequest): Promise<boolean> {
        const result = await NetFetch.postData('/json/upnpnat/save', upnpnat);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return true;
            }
        }

        return false;
    }

    /**
     * delete
     * @param id
     */
    public static async delete(id: number): Promise<boolean> {
        const request: UpnpNatDeleteRequest = {
            id: id
        };

        const result = await NetFetch.postData('/json/upnpnat/delete', request);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return true;
            }
        }

        return false;
    }

}