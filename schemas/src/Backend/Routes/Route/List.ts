import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaRouteVariable
 */
export const SchemaRouteVariable = Vts.object({
    name: Vts.string(),
    value: Vts.string()
});

/**
 * RouteVariable
 */
export type RouteVariable = ExtractSchemaResultType<typeof SchemaRouteVariable>;

/**
 * SchemaUpStream
 */
export const SchemaUpStream = Vts.object({
    id: Vts.number(),
    address: Vts.string(),
    port: Vts.number(),
    proxy_protocol_out: Vts.boolean()
});

/**
 * UpStream
 */
export type UpStream = ExtractSchemaResultType<typeof SchemaUpStream>;

/**
 * SchemaRouteStreamSSH
 */
export const SchemaRouteStreamSSH = Vts.object({
    id: Vts.number(),
    port: Vts.number(),
    user_id: Vts.number(),
    username: Vts.string(),
    password: Vts.string(),
    destinationAddress: Vts.string()
});

/**
 * RouteStreamSSH
 */
export type RouteStreamSSH = ExtractSchemaResultType<typeof SchemaRouteStreamSSH>;

/**
 * SchemaRouteStream
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

/**
 * RouteStream
 */
export type RouteStream = ExtractSchemaResultType<typeof SchemaRouteStream>;

/**
 * SchemaLocation
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

/**
 * Location
 */
export type Location = ExtractSchemaResultType<typeof SchemaLocation>;

/**
 * SchemaRouteHttp
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

/**
 * RouteHttp
 */
export type RouteHttp = ExtractSchemaResultType<typeof SchemaRouteHttp>;

/**
 * SchemaRouteData
 */
export const SchemaRouteData = Vts.object({
    id: Vts.number(),
    domainname: Vts.string(),
    domainfix: Vts.boolean(),
    streams: Vts.array(SchemaRouteStream),
    https: Vts.array(SchemaRouteHttp)
});

/**
 * RouteData
 */
export type RouteData = ExtractSchemaResultType<typeof SchemaRouteData>;

/**
 * SchemaRouteSshPort
 */
export const SchemaRouteSshPort = Vts.object({
    id: Vts.number(),
    port: Vts.number()
});

/**
 * RouteSshPort
 */
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

/**
 * RoutesResponse
 */
export type RoutesResponse = ExtractSchemaResultType<typeof SchemaRoutesResponse>;