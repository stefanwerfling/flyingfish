import {ExtractSchemaResultType, Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch';
import {SchemaDefaultReturn} from './Types/DefaultReturn';

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

/**
 * SchemaRouteVariable
 */
export const SchemaRouteVariable = Vts.object({
    name: Vts.string(),
    value: Vts.string()
});

export type RouteVariable = ExtractSchemaResultType<typeof SchemaRouteVariable>;

/**
 * UpStream
 */
export const SchemaUpStream = Vts.object({
    id: Vts.number(),
    address: Vts.string(),
    port: Vts.number()
});

export type UpStream = ExtractSchemaResultType<typeof SchemaUpStream>;

/**
 * RouteStreamSSH
 */
export const SchemaRouteStreamSSH = Vts.object({
    id: Vts.number(),
    port: Vts.number(),
    user_id: Vts.number(),
    username: Vts.string(),
    password: Vts.string(),
    destinationAddress: Vts.string()
});

export type RouteStreamSSH = ExtractSchemaResultType<typeof SchemaRouteStreamSSH>;

/**
 * RouteStream
 */
export const SchemaRouteStream = Vts.object({
    id: Vts.number(),
    listen_id: Vts.number(),
    destination_type: Vts.number(),
    destination_listen_id: Vts.number(),
    alias_name: Vts.string(),
    index: Vts.number(),
    isdefault: Vts.boolean(),
    use_as_default: Vts.boolean(),
    load_balancing_algorithm: Vts.string(),
    ssh_r_type: Vts.number(),
    ssh: Vts.optional(SchemaRouteStreamSSH),
    upstreams: Vts.array(SchemaUpStream)
});

export type RouteStream = ExtractSchemaResultType<typeof SchemaRouteStream>;

/**
 * Location
 */
export const SchemaLocation = Vts.object({
    id: Vts.number(),
    destination_type: Vts.number(),
    match: Vts.string(),
    proxy_pass: Vts.string(),
    ssh: Vts.optional(Vts.object({
        id: Vts.optional(Vts.number()),
        port_out: Vts.optional(Vts.number()),
        schema: Vts.optional(Vts.string())
    })),
    redirect: Vts.optional(Vts.object({
        code: Vts.number(),
        redirect: Vts.string()
    })),
    auth_enable: Vts.boolean(),
    websocket_enable: Vts.boolean(),
    host_enable: Vts.boolean(),
    host_name: Vts.string(),
    host_name_port: Vts.number(),
    xforwarded_scheme_enable: Vts.boolean(),
    xforwarded_proto_enable: Vts.boolean(),
    xforwarded_for_enable: Vts.boolean(),
    xrealip_enable: Vts.boolean(),
    variables: Vts.array(SchemaRouteVariable)
});

export type Location = ExtractSchemaResultType<typeof SchemaLocation>;

/**
 * RouteHttp
 */
export const SchemaRouteHttp = Vts.object({
    id: Vts.number(),
    listen_id: Vts.number(),
    index: Vts.number(),
    ssl: Vts.object({
        enable: Vts.boolean(),
        provider: Vts.string(),
        email: Vts.string()
    }),
    locations: Vts.array(SchemaLocation),
    http2_enable: Vts.boolean(),
    x_frame_options: Vts.string(),
    wellknown_disabled: Vts.boolean(),
    variables: Vts.array(SchemaRouteVariable)
});

export type RouteHttp = ExtractSchemaResultType<typeof SchemaRouteHttp>;

/**
 * HostData
 */
export const SchemaRouteData = Vts.object({
    id: Vts.number(),
    domainname: Vts.string(),
    domainfix: Vts.boolean(),
    streams: Vts.array(SchemaRouteStream),
    https: Vts.array(SchemaRouteHttp)
});

export type RouteData = ExtractSchemaResultType<typeof SchemaRouteData>;

/**
 * RouteSshPort
 */
export const SchemaRouteSshPort = Vts.object({
    id: Vts.number(),
    port: Vts.number()
});

export type RouteSshPort = ExtractSchemaResultType<typeof SchemaRouteSshPort>;

/**
 * RoutesResponse
 */
export const SchemaRoutesResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaRouteData),
    defaults: Vts.optional(Vts.object({
        dnsserverport: Vts.number(),
        sshports: Vts.array(SchemaRouteSshPort)
    }))
});

export type RoutesResponse = ExtractSchemaResultType<typeof SchemaRoutesResponse>;

/**
 * RouteStreamSave
 */
export const SchemaRouteStreamSave = Vts.object({
    domainid: Vts.number(),
    stream: SchemaRouteStream
});

export type RouteStreamSave = ExtractSchemaResultType<typeof SchemaRouteStreamSave>;

/**
 * RouteStreamDelete
 */
export const SchemaRouteStreamDelete = Vts.object({
    id: Vts.number()
});

export type RouteStreamDelete = ExtractSchemaResultType<typeof SchemaRouteStreamDelete>;

/**
 * RouteHttpSave
 */
export const SchemaRouteHttpSave = Vts.object({
    domainid: Vts.number(),
    http: SchemaRouteHttp
});

export type RouteHttpSave = ExtractSchemaResultType<typeof SchemaRouteHttpSave>;

/**
 * RouteStreamDeleteResponse
 */
export const SchemaRouteStreamDeleteResponse = SchemaDefaultReturn;
export type RouteStreamDeleteResponse = ExtractSchemaResultType<typeof SchemaRouteStreamDeleteResponse>;

/**
 * RouteHttpDelete
 */
export const SchemaRouteHttpDelete = Vts.object({
    id: Vts.number()
});

export type RouteHttpDelete = ExtractSchemaResultType<typeof SchemaRouteHttpDelete>;

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
        await NetFetch.postData('/json/route/stream/delete', data, SchemaRouteStreamDeleteResponse);
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