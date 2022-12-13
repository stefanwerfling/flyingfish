import {NetFetch} from '../Net/NetFetch';

/**
 * NginxStreamDestinationType
 */
export enum NginxStreamDestinationType {
    upstream,
    listen,
    ssh_l,
    ssh_r
}

/**
 * NginxStreamSshR
 */
export enum NginxStreamSshR {
    none,
    in,
    out
}

/**
 * Upstream load balancing algorithm
 */
export enum UpstreamLoadBalancingAlgorithm {
    none = 'none',
    least_conn = 'least_conn',
    ip_hash = 'ip_hash'
}

/**
 * UpStream
 */
export type UpStream = {
    id: number;
    address: string;
    port: number;
};

/**
 * RouteStreamSSH
 */
export type RouteStreamSSH = {
    id: number;
    port: number;
    user_id: number;
    username: string;
    password: string;
    destinationAddress: string;
};

/**
 * RouteStream
 */
export type RouteStream = {
    id: number;
    listen_id: number;
    destination_type: number;
    destination_listen_id: number;
    alias_name: string;
    index: number;
    isdefault: boolean;
    load_balancing_algorithm: string;
    ssh_r_type: number;
    ssh?: RouteStreamSSH;
    upstreams: UpStream[];
};

/**
 * Location
 */
export type Location = {
    id: number;
    match: string;
    proxy_pass: string;
    ssh?: {
        id?: number;
        port_out?: number;
        schema?: string;
    };
    redirect?: {
        code: number;
        redirect: string;
    };
    auth_enable: boolean;
    websocket_enable: boolean;
    host_enable: boolean;
    host_name: string;
    xforwarded_scheme_enable: boolean;
    xforwarded_proto_enable: boolean;
    xforwarded_for_enable: boolean;
    xrealip_enable: boolean;
};

/**
 * RouteHttp
 */
export type RouteHttp = {
    id: number;
    listen_id: number;
    index: number;
    ssl: {
        enable: boolean;
        provider: string;
        email: string;
    };
    locations: Location[];

    http2_enable: boolean;
    x_frame_options: string;
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
 * RouteStreamDelete
 */
export type RouteStreamDelete = {
    id: number;
};

/**
 * RouteHttpSave
 */
export type RouteHttpSave = {
    domainid: number;
    http: RouteHttp;
};

/**
 * RouteStreamDeleteResponse
 */
export type RouteStreamDeleteResponse = {
    status: string;
    error?: string;
};

/**
 * RouteHttpDelete
 */
export type RouteHttpDelete = {
    id: number;
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

    /**
     * deleteRouteStream
     * @param data
     */
    public static async deleteRouteStream(data: RouteStreamDelete): Promise<boolean> {
        const result = await NetFetch.postData('/json/route/stream/delete', data);

        if (result) {
            if (result.status === 'ok') {
                return true;
            } else {
                throw new Error(result.error);
            }
        }

        return false;
    }

    /**
     * saveRouteHttp
     * @param stream
     */
    public static async saveRouteHttp(stream: RouteHttpSave): Promise<boolean> {
        const result = await NetFetch.postData('/json/route/http/save', stream);

        if (result) {
            if (result.status === 'ok') {
                return true;
            } else {
                throw new Error(result.error);
            }
        }

        return false;
    }

    /**
     * deleteRouteHttp
     * @param data
     */
    public static async deleteRouteHttp(data: RouteHttpDelete): Promise<boolean> {
        const result = await NetFetch.postData('/json/route/http/delete', data);

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