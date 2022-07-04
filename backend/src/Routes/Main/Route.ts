import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
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
    id: number;
    listen_id: number;
    destination_listen_id: number;
    upstreams: UpStream[];
    alias_name: string;
    index: number;
    isdefault: boolean;
    ssh: {
        port_in?: number;
        port_out?: number;
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
 * RouteStreamSaveResponse
 */
export type RouteStreamSaveResponse = {
    status: string;
    error?: string;
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
                                id: tstream.id,
                                listen_id: tstream.listen_id,
                                destination_listen_id: tstream.destination_listen_id,
                                alias_name: tstream.alias_name,
                                index: tstream.index,
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
                                id: thttp.id,
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

    /**
     * saveStreamRoute
     * @param session
     * @param request
     */
    @Post('/json/route/stream/save')
    public async saveStreamRoute(
        @Session() session: any,
        @Body() request: RouteStreamSave
    ): Promise<RouteStreamSaveResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const streamRepository = MariaDbHelper.getRepository(NginxStreamDB);
            const upstreamRepository = MariaDbHelper.getRepository(NginxUpstreamDB);

            let aStream: NginxStreamDB|null = null;

            if (request.stream.id !== 0) {
                const tStream = await streamRepository.findOne({
                    where: {
                        id: request.stream.id
                    }
                });

                if (tStream) {
                    aStream = tStream;
                } else {
                    return {
                        status: 'error',
                        error: `entry not found by id: ${request.stream.id}`
                    };
                }
            }

            if (aStream === null) {
                aStream = new NginxStreamDB();
            }

            aStream.domain_id = request.domainid;
            aStream.listen_id = request.stream.listen_id;
            aStream.alias_name = request.stream.alias_name;
            aStream.index = request.stream.index;
            aStream.destination_listen_id = request.stream.destination_listen_id;
            aStream.sshport_in_id = 0;
            aStream.sshport_out_id = 0;

            if (request.stream.ssh) {
                if (request.stream.ssh.port_in && (request.stream.ssh.port_in > 0)) {
                    aStream.sshport_in_id = request.stream.ssh.port_in;
                } else if (request.stream.ssh.port_out && (request.stream.ssh.port_out > 0)) {
                    aStream.sshport_out_id = request.stream.ssh.port_out;
                }
            }

            aStream = await MariaDbHelper.getConnection().manager.save(aStream);

            if (aStream.destination_listen_id > 0) {
                // clear old upstreams
                await upstreamRepository.delete({
                    stream_id: aStream.id
                });
            } else if (request.stream.upstreams.length > 0) {
                // remove delete upstreams -----------------------------------------------------------------------------
                const tupstreams = await upstreamRepository.find({
                    where: {
                        stream_id: aStream.id
                    }
                });

                if (tupstreams) {
                    const checkUpstreamExistence = (upstreamId: number): boolean => request.stream.upstreams.some(({id}) => id === upstreamId);

                    for (const oldUpstream of tupstreams) {
                        if (!checkUpstreamExistence(oldUpstream.id)) {
                            await upstreamRepository.delete({
                                id: oldUpstream.id
                            });
                        }
                    }
                }

                // update or add new upstreams -------------------------------------------------------------------------

                for (const aUpstream of request.stream.upstreams) {
                    let aNewUpstream: NginxUpstreamDB|null = null;

                    if (aUpstream.id > 0) {
                        const tUpstream = await upstreamRepository.findOne({
                            where: {
                                id: aUpstream.id
                            }
                        });

                        if (tUpstream) {
                            aNewUpstream = tUpstream;
                        }
                    }

                    if (aNewUpstream === null) {
                        aNewUpstream = new NginxUpstreamDB();
                        aNewUpstream.stream_id = aStream.id;
                    }

                    aNewUpstream.destination_address = aUpstream.address;
                    aNewUpstream.destination_port = aUpstream.port;

                    await MariaDbHelper.getConnection().manager.save(aNewUpstream);
                }
            }

            return {
                status: 'ok'
            };
        }

        return {
            status: 'error',
            error: 'user not login!'
        };
    }

}