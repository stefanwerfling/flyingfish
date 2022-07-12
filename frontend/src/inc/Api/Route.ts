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
    id: number;
    listen_id: number;
    destination_listen_id: number;
    upstreams: UpStream[];
    alias_name: string;
    index: number;
    isdefault: boolean;
    ssh: {
        in?: {
            id: number;
            port: number;
            user_id: number;
            username: string;
            password: string;
        };
        out?: {
            id: number;
            port: number;
        };
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
    id: number;
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
 * RouteSshPort
 */
export type RouteSshPort = {
    id: number;
    port: number;
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
        sshports: RouteSshPort[];
    };
};

/**
 * RouteStreamSave
 */
export type RouteStreamSave = {
    domainid: number;
    stream: RouteStream;
};

/**
 * RouteStreamSaveResponse
 */
export type RouteStreamSaveResponse = {
    status: string;
    error?: string;
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

    /**
     * saveRouteStream
     * @param stream
     */
    public static async saveRouteStream(stream: RouteStreamSave): Promise<boolean> {
        const result = await NetFetch.postData('/json/route/stream/save', stream);

        if (result) {
            if (result.status === 'ok') {
                return true;
            } else {
                throw new Error(result.error);
            }
        }

        return false;
    }

}