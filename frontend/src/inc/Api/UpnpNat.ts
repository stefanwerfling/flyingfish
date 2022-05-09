import {NetFetch} from '../Net/NetFetch';

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
 * UpnpNatResponse
 */
export type UpnpNatResponse = {
    status: string;
    error?: string;
    data: UpnpNatDevice[];
};

/**
 * UpnpNat
 */
export class UpnpNat {

    /**
     * getList
     */
    public static async getList(): Promise<UpnpNatDevice[] | null> {
        const result = await NetFetch.getData('/json/upnpnat/list');

        if (result) {
            if (result.status === 'ok') {
                return result.data as UpnpNatDevice[];
            }
        }

        return null;
    }

}