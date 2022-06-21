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
 * RouteStream
 */
export type RouteStream = {
    listen_id: number;
    upstreams: UpStream[];
    alias_name: string;
    isdefault: boolean;
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
 * RouteHttp
 */
export type RouteHttp = {
    listen_id: number;
    locations: Location[];
};

/**
 * HostData
 */
export type RouteData = {
    id: number;
    domainname: string;
    domainfix: boolean;
    streams: RouteStream[];
    https: RouteHttp[];
};

/**
 * RoutesResponse
 */
export type RoutesResponse = {
    status: string;
    msg?: string;
    list: RouteData[];
    defaults?: {
        dnsserverport: number;
    };
};

/**
 * Route
 */
export class Route {

    /**
     * getHosts
     */
    public static async getRoutes(): Promise<RoutesResponse| null> {
        const result = await NetFetch.getData('/json/route/list');

        if (result) {
            if (result.status === 'ok') {
                return result as RoutesResponse;
            }
        }

        return null;
    }

}