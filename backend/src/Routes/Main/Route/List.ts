import {DBHelper} from 'flyingfish_core';
import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {ExtractSchemaResultType, Vts} from 'vts';
import {Config} from '../../../inc/Config/Config.js';
import {DomainService} from '../../../inc/Db/MariaDb/DomainService.js';
import {NginxHttp as NginxHttpDB} from '../../../inc/Db/MariaDb/Entity/NginxHttp.js';
import {
    NginxHttpVariable as NginxHttpVariableDB,
    NginxHttpVariableContextType
} from '../../../inc/Db/MariaDb/Entity/NginxHttpVariable.js';
import {NginxLocation as NginxLocationDB} from '../../../inc/Db/MariaDb/Entity/NginxLocation.js';
import {NginxUpstream as NginxUpstreamDB} from '../../../inc/Db/MariaDb/Entity/NginxUpstream.js';
import {SshPort as SshPortDB} from '../../../inc/Db/MariaDb/Entity/SshPort.js';
import {SshUser as SshUserDB} from '../../../inc/Db/MariaDb/Entity/SshUser.js';
import {NginxStream as NginxStreamDB} from '../../../inc/Db/MariaDb/Entity/NginxStream.js';

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
    port: Vts.number(),
    proxy_protocol_out: Vts.boolean()
});

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
export type RoutesResponse = DefaultReturn & {
    list: RouteData[];
    defaults?: {
        dnsserverport: number;
        sshports: RouteSshPort[];
    };
};

/**
 * List
 */
export class List {

    /**
     * getRoutes
     */
    public static async getRoutes(): Promise<RoutesResponse> {
        const list: RouteData[] = [];
        const sshportList: RouteSshPort[] = [];

        const streamRepository = DBHelper.getRepository(NginxStreamDB);
        const upstreamRepository = DBHelper.getRepository(NginxUpstreamDB);
        const httpRepository = DBHelper.getRepository(NginxHttpDB);
        const httpVariableRepository = DBHelper.getRepository(NginxHttpVariableDB);
        const locationRepository = DBHelper.getRepository(NginxLocationDB);
        const sshportRepository = DBHelper.getRepository(SshPortDB);
        const sshuserRepository = DBHelper.getRepository(SshUserDB);
        const domains = await DomainService.findAll();

        if (domains) {
            for await (const adomain of domains) {
                const streamList: RouteStream[] = [];
                const httpList: RouteHttp[] = [];

                // stream ------------------------------------------------------------------------------------------

                const streams = await streamRepository.find({
                    where: {
                        domain_id: adomain.id
                    }
                });

                if (streams) {
                    for await (const tstream of streams) {
                        const streamEntry: RouteStream = {
                            id: tstream.id,
                            listen_id: tstream.listen_id,
                            destination_listen_id: tstream.destination_listen_id,
                            alias_name: tstream.alias_name,
                            index: tstream.index,
                            isdefault: tstream.isdefault,
                            use_as_default: tstream.use_as_default,
                            load_balancing_algorithm: tstream.load_balancing_algorithm,
                            destination_type: tstream.destination_type,
                            ssh_r_type: tstream.ssh_r_type,
                            upstreams: []
                        };

                        const upstreams = await upstreamRepository.find({
                            where: {
                                stream_id: tstream.id
                            }
                        });

                        for (const aupstream of upstreams) {
                            streamEntry.upstreams.push({
                                id: aupstream.id,
                                address: aupstream.destination_address,
                                port: aupstream.destination_port,
                                proxy_protocol_out: aupstream.proxy_protocol_out
                            });
                        }

                        if (tstream.sshport_id > 0) {
                            const sshport = await sshportRepository.findOne({
                                where: {
                                    id: tstream.sshport_id
                                }
                            });

                            if (sshport) {
                                streamEntry.ssh = {
                                    id: sshport.id,
                                    port: sshport.port,
                                    destinationAddress: sshport.destinationAddress,
                                    user_id: 0,
                                    username: '',
                                    password: ''
                                };

                                const sshuser = await sshuserRepository.findOne({
                                    where: {
                                        id: sshport.ssh_user_id
                                    }
                                });

                                if (sshuser) {
                                    streamEntry.ssh.username = sshuser.username;
                                    streamEntry.ssh.password = sshuser.password;
                                }
                            }
                        }

                        streamList.push(streamEntry);
                    }
                }

                // http --------------------------------------------------------------------------------------------

                const https = await httpRepository.find({
                    where: {
                        domain_id: adomain.id
                    }
                });

                if (https) {
                    for await (const thttp of https) {
                        const variableList: RouteVariable[] = [];

                        const variables = await httpVariableRepository.find({
                            where: {
                                http_id: thttp.id,
                                context_type: NginxHttpVariableContextType.server
                            }
                        });

                        for (const tvar of variables) {
                            variableList.push({
                                name: tvar.var_name,
                                value: tvar.var_value
                            });
                        }

                        const httpEntry: RouteHttp = {
                            id: thttp.id,
                            listen_id: thttp.listen_id,
                            index: thttp.index,
                            ssl: {
                                enable: thttp.ssl_enable,
                                provider: thttp.cert_provider,
                                email: thttp.cert_email
                            },
                            locations: [],
                            http2_enable: thttp.http2_enable,
                            x_frame_options: thttp.x_frame_options,
                            wellknown_disabled: thttp.wellknown_disabled,
                            variables: variableList
                        };

                        const locations = await locationRepository.find({
                            where: {
                                http_id: thttp.id
                            }
                        });

                        for await (const alocation of locations) {
                            const lVariableList: RouteVariable[] = [];

                            const lVariables = await httpVariableRepository.find({
                                where: {
                                    http_id: thttp.id,
                                    context_type: NginxHttpVariableContextType.location
                                }
                            });

                            for (const tvar of lVariables) {
                                lVariableList.push({
                                    name: tvar.var_name,
                                    value: tvar.var_value
                                });
                            }

                            const location: Location = {
                                id: alocation.id,
                                destination_type: alocation.destination_type,
                                match: alocation.match,
                                proxy_pass: alocation.proxy_pass,
                                auth_enable: alocation.auth_enable,
                                websocket_enable: alocation.websocket_enable,
                                host_enable: alocation.host_enable,
                                host_name: alocation.host_name,
                                host_name_port: alocation.host_name_port,
                                xforwarded_scheme_enable: alocation.xforwarded_scheme_enable,
                                xforwarded_proto_enable: alocation.xforwarded_proto_enable,
                                xforwarded_for_enable: alocation.xforwarded_for_enable,
                                xrealip_enable: alocation.xrealip_enable,
                                variables: lVariableList
                            };

                            if (alocation.sshport_out_id > 0) {
                                const sshport = await sshportRepository.findOne({
                                    where: {
                                        id: alocation.sshport_out_id
                                    }
                                });

                                if (sshport) {
                                    location.ssh = {};
                                    location.ssh.id = sshport.id;
                                    location.ssh.port_out = sshport.port;
                                    location.ssh.schema = alocation.sshport_schema;
                                }
                            }

                            if (alocation.redirect !== '') {
                                location.redirect = {
                                    code: alocation.redirect_code,
                                    redirect: alocation.redirect
                                };
                            }

                            httpEntry.locations.push(location);
                        }

                        httpList.push(httpEntry);
                    }
                }

                list.push({
                    id: adomain.id,
                    domainname: adomain.domainname,
                    domainfix: adomain.fixdomain,
                    streams: streamList,
                    https: httpList
                });
            }
        }

        // load defaults -------------------------------------------------------------------------------------------

        const sshports = await sshportRepository.find();

        for (const sshport of sshports) {
            sshportList.push({
                id: sshport.id,
                port: sshport.port
            });
        }

        // defaults ----------------------------------------------------------------------------------------------------

        const dnsserverport = Config.getInstance().get()?.dnsserver?.port || 5333;

        return {
            statusCode: StatusCodes.OK,
            list: list,
            defaults: {
                dnsserverport: dnsserverport,
                sshports: sshportList
            }
        };
    }

}