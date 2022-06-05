import {NetFetch} from '../Net/NetFetch';

/**
 * UpStream
 */
export type UpStream = {
    id: number;
    address: string;
    port: number;
};

/**
 * HostStream
 */
export type HostStream = {
    listen_id: number;
    upstreams: UpStream[];
    alias_name: string;
    ssh: {
        port_in?: number;
        port_out?: number;
    };
};

/**
 * Location
 */
export type Location = {
    id: number;
    match: string;
    proxy_pass: string;
    ssh: {
        id?: number;
        port_out?: number;
        schema?: string;
    };
};

/**
 * HostHttp
 */
export type HostHttp = {
    listen_id: number;
    locations: Location[];
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