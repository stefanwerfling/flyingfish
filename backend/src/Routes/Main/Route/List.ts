import {
    CredentialLocationServiceDB,
    DomainServiceDB, NginxHttpServiceDB, NginxHttpVariableServiceDB, NginxLocationServiceDB,
    NginxStreamServiceDB,
    NginxUpstreamServiceDB, SshPortServiceDB,
    SshUserServiceDB,
    CredentialServiceDB
} from 'flyingfish_core';
import {
    Location, LocationCredential, NginxHttpVariableContextType,
    RouteData,
    RouteHttp,
    RoutesResponse,
    RouteSshPort,
    RouteStream,
    RouteVariable,
    StatusCodes
} from 'flyingfish_schemas';
import {Config} from '../../../inc/Config/Config.js';

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

        const credentials = await CredentialServiceDB.getInstance().findAll();
        const credentialMap: Map<number, string> = new Map<number, string>();

        for (const credential of credentials) {
            credentialMap.set(credential.id, credential.name);
        }

        // -------------------------------------------------------------------------------------------------------------

        const domains = await DomainServiceDB.getInstance().findAll();

        if (domains) {
            for await (const adomain of domains) {
                const streamList: RouteStream[] = [];
                const httpList: RouteHttp[] = [];

                // stream ------------------------------------------------------------------------------------------

                const streams = await NginxStreamServiceDB.getInstance().findAllByDomain(adomain.id);

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

                        const upstreams = await NginxUpstreamServiceDB.getInstance().findAllStreams(tstream.id);

                        for (const aupstream of upstreams) {
                            streamEntry.upstreams.push({
                                id: aupstream.id,
                                address: aupstream.destination_address,
                                port: aupstream.destination_port,
                                proxy_protocol_out: aupstream.proxy_protocol_out
                            });
                        }

                        if (tstream.sshport_id > 0) {
                            const sshport = await SshPortServiceDB.getInstance().findOne(tstream.sshport_id);

                            if (sshport) {
                                streamEntry.ssh = {
                                    id: sshport.id,
                                    port: sshport.port,
                                    destinationAddress: sshport.destinationAddress,
                                    user_id: 0,
                                    username: '',
                                    password: ''
                                };

                                const sshuser = await SshUserServiceDB.getInstance().findOne(sshport.ssh_user_id);

                                if (sshuser) {
                                    streamEntry.ssh.username = sshuser.username;
                                    streamEntry.ssh.password = sshuser.password;
                                }
                            }
                        }

                        streamList.push(streamEntry);
                    }
                }

                // http ------------------------------------------------------------------------------------------------

                const https = await NginxHttpServiceDB.getInstance().findAllByDomain(adomain.id);

                if (https) {
                    for await (const thttp of https) {
                        const variableList: RouteVariable[] = [];

                        const variables = await NginxHttpVariableServiceDB.getInstance().findAllBy(
                            thttp.id,
                            NginxHttpVariableContextType.server
                        );

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
                                email: thttp.cert_email,
                                wildcard: thttp.cert_wildcard
                            },
                            locations: [],
                            http2_enable: thttp.http2_enable,
                            x_frame_options: thttp.x_frame_options,
                            wellknown_disabled: thttp.wellknown_disabled,
                            variables: variableList
                        };

                        const locations = await NginxLocationServiceDB.getInstance().findAllByHttp(thttp.id);

                        for await (const alocation of locations) {
                            const lVariableList: RouteVariable[] = [];

                            const lVariables = await NginxHttpVariableServiceDB.getInstance().findAllBy(
                                thttp.id,
                                NginxHttpVariableContextType.location
                            );

                            for (const tvar of lVariables) {
                                lVariableList.push({
                                    name: tvar.var_name,
                                    value: tvar.var_value
                                });
                            }

                            const credentialList: LocationCredential[] = [];

                            const lcredentials = await CredentialLocationServiceDB.getInstance().getListByLocation(alocation.id);

                            for (const lcredential of lcredentials) {
                                const name = credentialMap.get(lcredential.credential_id);

                                if (name) {
                                    credentialList.push({
                                        id: lcredential.credential_id,
                                        name: name
                                    });
                                }
                            }

                            const location: Location = {
                                id: alocation.id,
                                destination_type: alocation.destination_type,
                                match: alocation.match,
                                proxy_pass: alocation.proxy_pass,
                                auth_enable: alocation.auth_enable,
                                credentials: credentialList,
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
                                const sshport = await SshPortServiceDB.getInstance().findOne(alocation.sshport_out_id);

                                if (sshport) {
                                    location.ssh = {
                                        id: sshport.id,
                                        port_out: sshport.port,
                                        schema: alocation.sshport_schema
                                    };
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

        // load defaults -----------------------------------------------------------------------------------------------

        const sshports = await SshPortServiceDB.getInstance().findAll();

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