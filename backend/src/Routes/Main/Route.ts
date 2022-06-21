import {Get, JsonController, Session} from 'routing-controllers';
import {Config} from '../../inc/Config/Config';
import {Domain as DomainDB} from '../../inc/Db/MariaDb/Entity/Domain';
import {NginxHttp as NginxHttpDB} from '../../inc/Db/MariaDb/Entity/NginxHttp';
import {NginxLocation as NginxLocationDB} from '../../inc/Db/MariaDb/Entity/NginxLocation';
import {NginxStream as NginxStreamDB} from '../../inc/Db/MariaDb/Entity/NginxStream';
import {NginxUpstream as NginxUpstreamDB} from '../../inc/Db/MariaDb/Entity/NginxUpstream';
import {SshPort as SshPortDB} from '../../inc/Db/MariaDb/Entity/SshPort';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

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
@JsonController()
export class Route {

    /**
     * getRoutes
     * @param session
     */
    @Get('/json/route/list')
    public async getRoutes(@Session() session: any): Promise<RoutesResponse> {
        const list: RouteData[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            const domainRepository = MariaDbHelper.getRepository(DomainDB);
            const streamRepository = MariaDbHelper.getRepository(NginxStreamDB);
            const upstreamRepository = MariaDbHelper.getRepository(NginxUpstreamDB);
            const httpRepository = MariaDbHelper.getRepository(NginxHttpDB);
            const locationRepository = MariaDbHelper.getRepository(NginxLocationDB);
            const sshportRepository = MariaDbHelper.getRepository(SshPortDB);
            const domains = await domainRepository.find();

            if (domains) {
                for (const adomain of domains) {
                    const streamList: RouteStream[] = [];
                    const httpList: RouteHttp[] = [];

                    const streams = await streamRepository.find({
                        where: {
                            domain_id: adomain.id
                        }
                    });

                    if (streams) {
                        for (const tstream of streams) {
                            const streamEntry: RouteStream = {
                                listen_id: tstream.listen_id,
                                alias_name: tstream.alias_name,
                                isdefault: tstream.isdefault,
                                upstreams: [],
                                ssh: {}
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
                                    port: aupstream.destination_port
                                });
                            }

                            if (tstream.sshport_in_id > 0) {
                                const sshport = await sshportRepository.findOne({
                                    where: {
                                        id: tstream.sshport_in_id
                                    }
                                });

                                if (sshport) {
                                    streamEntry.ssh.port_in = sshport.port;
                                }
                            }

                            if (tstream.sshport_out_id > 0) {
                                const sshport = await sshportRepository.findOne({
                                    where: {
                                        id: tstream.sshport_out_id
                                    }
                                });

                                if (sshport) {
                                    streamEntry.ssh.port_out = sshport.port;
                                }
                            }

                            streamList.push(streamEntry);
                        }
                    }

                    const https = await httpRepository.find({
                        where: {
                            domain_id: adomain.id
                        }
                    });

                    if (https) {
                        for (const thttp of https) {
                            const httpEntry: RouteHttp = {
                                listen_id: thttp.listen_id,
                                locations: []
                            };

                            const locations = await locationRepository.find({
                                where: {
                                    http_id: thttp.id
                                }
                            });

                            for (const alocation of locations) {
                                const location: Location = {
                                    id: alocation.id,
                                    match: alocation.match,
                                    proxy_pass: alocation.proxy_pass,
                                    ssh: {}
                                };

                                if (alocation.sshport_out_id > 0) {
                                    const sshport = await sshportRepository.findOne({
                                        where: {
                                            id: alocation.sshport_out_id
                                        }
                                    });

                                    if (sshport) {
                                        location.ssh.id = sshport.id;
                                        location.ssh.port_out = sshport.port;
                                        location.ssh.schema = alocation.sshport_schema;
                                    }
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
        } else {
            return {
                status: 'error',
                msg: 'Please login!',
                list: []
            };
        }

        const dnsserverport = Config.get()?.dnsserver?.port || 5333;

        return {
            status: 'ok',
            list,
            defaults: {
                dnsserverport
            }
        };
    }

}