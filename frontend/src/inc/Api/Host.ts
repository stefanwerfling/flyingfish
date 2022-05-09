import {NetFetch} from '../Net/NetFetch';

/**
 * HostStream
 */
export type HostStream = {
    listen_id: number;
    destination_address: string;
    destination_port: number;
    alias_name: string;
    ssh?: {
        port: number;
    };
};

/**
 * HostHttp
 */
export type HostHttp = {
    listen_id: number;
};

/**
 * HostData
 */
export type HostData = {
    id: number;
    domainname: string;
    streams: HostStream[];
    https: HostHttp[];
};

/**
 * HostsResponse
 */
export type HostsResponse = {
    status: string;
    msg?: string;
    list: HostData[];
};

/**
 * Host
 */
export class Host {

    /**
     * getHosts
     */
    public static async getHosts(): Promise<HostsResponse| null> {
        const result = await NetFetch.getData('/json/host/list');

        if (result) {
            if (result.status === 'ok') {
                return result as HostsResponse;
            }
        }

        return null;
    }

}