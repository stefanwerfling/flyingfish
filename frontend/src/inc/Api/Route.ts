import {
    RouteHttpDelete,
    RouteHttpSave,
    RoutesResponse, RouteStreamDelete, RouteStreamSave,
    SchemaDefaultReturn,
    SchemaRoutesResponse
} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch.js';

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
 * NginxLocationDestinationTypes
 */
export enum NginxLocationDestinationTypes {
    none = 0,
    proxypass = 1,
    redirect = 2,
    ssh = 3,
    dyndns = 4,
    vpn = 5
}

/**
 * Upstream load balancing algorithm
 */
export enum UpstreamLoadBalancingAlgorithm {
    none = 'none',
    least_conn = 'least_conn',
    ip_hash = 'ip_hash'
}

export enum NginxHTTPVariables {
    client_max_body_size = 'client_max_body_size'
}

/**
 * Route
 */
export class Route {

    /**
     * getHosts
     */
    public static async getRoutes(): Promise<RoutesResponse> {
        return NetFetch.getData('/json/route/list', SchemaRoutesResponse);
    }

    /**
     * saveRouteStream
     * @param stream
     */
    public static async saveRouteStream(stream: RouteStreamSave): Promise<boolean> {
        await NetFetch.postData('/json/route/stream/save', stream, SchemaDefaultReturn);
        return true;
    }

    /**
     * deleteRouteStream
     * @param data
     */
    public static async deleteRouteStream(data: RouteStreamDelete): Promise<boolean> {
        await NetFetch.postData('/json/route/stream/delete', data, SchemaDefaultReturn);
        return true;
    }

    /**
     * saveRouteHttp
     * @param stream
     */
    public static async saveRouteHttp(stream: RouteHttpSave): Promise<boolean> {
        await NetFetch.postData('/json/route/http/save', stream, SchemaDefaultReturn);
        return true;
    }

    /**
     * deleteRouteHttp
     * @param data
     */
    public static async deleteRouteHttp(data: RouteHttpDelete): Promise<boolean> {
        await NetFetch.postData('/json/route/http/delete', data, SchemaDefaultReturn);
        return true;
    }

}