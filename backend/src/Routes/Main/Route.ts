import * as bcrypt from 'bcrypt';
import {Body, Get, JsonController, Post, Session} from 'routing-controllers-extended';
import {Config} from '../../inc/Config/Config.js';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {Domain as DomainDB} from '../../inc/Db/MariaDb/Entity/Domain.js';
import {NginxHttp as NginxHttpDB} from '../../inc/Db/MariaDb/Entity/NginxHttp.js';
import {NginxLocation as NginxLocationDB} from '../../inc/Db/MariaDb/Entity/NginxLocation.js';
import {
    NginxStream as NginxStreamDB,
    NginxStreamDestinationType,
    NginxStreamSshR
} from '../../inc/Db/MariaDb/Entity/NginxStream.js';
import {NginxUpstream as NginxUpstreamDB} from '../../inc/Db/MariaDb/Entity/NginxUpstream.js';
import {SshPort as SshPortDB} from '../../inc/Db/MariaDb/Entity/SshPort.js';
import {SshUser as SshUserDB} from '../../inc/Db/MariaDb/Entity/SshUser.js';

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
    host_name_port: number;
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
 * RouteHttpSave
 */
export type RouteHttpSave = {
    domainid: number;
    http: RouteHttp;
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
 * RouteStreamSaveResponse
 */
export type RouteStreamSaveResponse = {
    status: string;
    error?: string;
};

/**
 * RouteHttpSaveResponse
 */
export type RouteHttpSaveResponse = {
    status: string;
    error?: string;
};

/**
 * RouteStreamDelete
 */
export type RouteStreamDelete = {
    id: number;
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
 * RouteHttpDeleteResponse
 */
export type RouteHttpDeleteResponse = {
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
        const sshportList: RouteSshPort[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            const domainRepository = DBHelper.getRepository(DomainDB);
            const streamRepository = DBHelper.getRepository(NginxStreamDB);
            const upstreamRepository = DBHelper.getRepository(NginxUpstreamDB);
            const httpRepository = DBHelper.getRepository(NginxHttpDB);
            const locationRepository = DBHelper.getRepository(NginxLocationDB);
            const sshportRepository = DBHelper.getRepository(SshPortDB);
            const sshuserRepository = DBHelper.getRepository(SshUserDB);
            const domains = await domainRepository.find();

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
                                    port: aupstream.destination_port
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
                                x_frame_options: thttp.x_frame_options
                            };

                            const locations = await locationRepository.find({
                                where: {
                                    http_id: thttp.id
                                }
                            });

                            for await (const alocation of locations) {
                                const location: Location = {
                                    id: alocation.id,
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
                                    xrealip_enable: alocation.xrealip_enable
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
        } else {
            return {
                status: 'error',
                msg: 'Please login!',
                list: []
            };
        }

        // defaults ----------------------------------------------------------------------------------------------------

        const dnsserverport = Config.get()?.dnsserver?.port || 5333;

        return {
            status: 'ok',
            list: list,
            defaults: {
                dnsserverport: dnsserverport,
                sshports: sshportList
            }
        };
    }

    /**
     * _isSshPortUsed
     * @param tport
     * @param sshportid
     * @protected
     */
    protected async _isSshPortUsed(tport: number, sshportid: number): Promise<boolean> {
        const sshportRepository = DBHelper.getRepository(SshPortDB);

        const sshport = await sshportRepository.findOne({
            where: {
                port: tport
            }
        });

        if (sshport) {
            if (sshport.id !== sshportid) {
                return true;
            }
        }

        return false;
    }

    /**
     * _getFreePort
     * @param tport
     * @protected
     */
    protected async _getFreePort(tport: number = 10000): Promise<number> {
        const sshportRepository = DBHelper.getRepository(SshPortDB);
        const sshport = await sshportRepository.findOne({
            where: {
                port: tport
            }
        });

        if (sshport) {
            return this._getFreePort(tport + 1);
        }

        return tport;
    }

    /**
     * _removeOldSshPort
     * can only remove when nothing other entry it used
     * @param sshportId
     * @protected
     */
    protected async _removeOldSshPort(sshportId: number): Promise<boolean> {
        const streamRepository = DBHelper.getRepository(NginxStreamDB);
        const sshportRepository = DBHelper.getRepository(SshPortDB);
        const sshuserRepository = DBHelper.getRepository(SshUserDB);
        const locationRepository = DBHelper.getRepository(NginxLocationDB);

        // first check in used -----------------------------------------------------------------------------------------

        const usedCountStreamROut = await streamRepository.count({
            where: {
                destination_type: NginxStreamDestinationType.ssh_r,
                ssh_r_type: NginxStreamSshR.out,
                sshport_id: sshportId
            }
        });

        const outUsedCountLoc = await locationRepository.count({
            where: {
                sshport_out_id: sshportId
            }
        });

        if ((usedCountStreamROut > 0) || (outUsedCountLoc > 0)) {
            return false;
        }

        // clean ssh port ----------------------------------------------------------------------------------------------

        const sshport = await sshportRepository.findOne({
            where: {
                id: sshportId
            }
        });

        if (sshport) {
            if (sshport.ssh_user_id > 0) {
                await sshuserRepository.delete({
                    id: sshport.ssh_user_id
                });
            }

            const result = await sshportRepository.delete({
                id: sshport.id
            });

            if (result) {
                return true;
            }
        }

        return false;
    }

    /**
     * _saveStreamSsh
     * @param ssh
     * @param dtype
     * @protected
     */
    protected async _saveStreamSsh(ssh: RouteStreamSSH, dtype: NginxStreamDestinationType): Promise<number> {
        if (dtype !== NginxStreamDestinationType.ssh_r && dtype !== NginxStreamDestinationType.ssh_l) {
            throw Error('Is not a ssh type for save!');
        }

        const sshportRepository = DBHelper.getRepository(SshPortDB);
        const sshuserRepository = DBHelper.getRepository(SshUserDB);

        let sshuser: SshUserDB|null = null;
        let sshport: SshPortDB|null = null;

        if (ssh.user_id > 0) {
            const tsshuser = await sshuserRepository.findOne({
                where: {
                    id: ssh.user_id
                }
            });

            if (tsshuser) {
                sshuser = tsshuser;
            }
        }

        if (sshuser === null) {
            sshuser = new SshUserDB();
        }

        sshuser.username = ssh.username;

        if (ssh.password !== '') {
            sshuser.password = await bcrypt.hash(ssh.password, 10);
        }

        sshuser.disable = false;

        sshuser = await DBHelper.getDataSource().manager.save(sshuser);

        if (ssh.id > 0) {
            const tsshport = await sshportRepository.findOne({
                where: {
                    id: ssh.id
                }
            });

            if (tsshport) {
                sshport = tsshport;
            }
        }

        if (sshport === null) {
            sshport = new SshPortDB();
        }

        if (dtype === NginxStreamDestinationType.ssh_r) {
            if (ssh.port === 0) {
                sshport.port = await this._getFreePort();
            } else {
                if (await this._isSshPortUsed(ssh.port, ssh.id)) {
                    throw Error('SSH Port is alrady in use!');
                }

                sshport.port = ssh.port;
            }
        } else {
            sshport.port = ssh.port;
        }

        sshport.ssh_user_id = sshuser.id;
        sshport.destinationAddress = ssh.destinationAddress;

        sshport = await DBHelper.getDataSource().manager.save(sshport);

        return sshport.id;
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
            const streamRepository = DBHelper.getRepository(NginxStreamDB);
            const upstreamRepository = DBHelper.getRepository(NginxUpstreamDB);

            let aStream: NginxStreamDB|null = null;

            if (request.stream.id !== 0) {
                const tStream = await streamRepository.findOne({
                    where: {
                        id: request.stream.id
                    }
                });

                if (tStream) {
                    if (tStream.isdefault) {
                        return {
                            status: 'error',
                            error: `stream can not edit, this is a default route by id: ${request.stream.id}`
                        };
                    }

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
            aStream.index = 0;

            if (request.stream.index > 0) {
                aStream.index = request.stream.index;
            }

            aStream.destination_type = request.stream.destination_type;
            aStream.destination_listen_id = request.stream.destination_listen_id;
            aStream.load_balancing_algorithm = request.stream.load_balancing_algorithm;
            aStream.ssh_r_type = NginxStreamSshR.none;
            aStream.sshport_id = 0;

            if (request.stream.ssh) {
                switch (aStream.destination_type) {

                    // ssh r -------------------------------------------------------------------------------------------
                    case NginxStreamDestinationType.ssh_r:
                        aStream.ssh_r_type = request.stream.ssh_r_type;

                        switch (aStream.ssh_r_type) {

                            // ssh r in --------------------------------------------------------------------------------
                            case NginxStreamSshR.in:
                                try {
                                    aStream.sshport_id = await this._saveStreamSsh(
                                        request.stream.ssh,
                                        NginxStreamDestinationType.ssh_r
                                    );
                                } catch (e) {
                                    return {
                                        status: 'error',
                                        error: (e as Error).message
                                    };
                                }
                                break;

                            // ssh r out -------------------------------------------------------------------------------
                            case NginxStreamSshR.out:
                                aStream.sshport_id = request.stream.ssh.id;
                                break;
                        }

                        break;

                    // ssh l -------------------------------------------------------------------------------------------
                    case NginxStreamDestinationType.ssh_l:
                        try {
                            aStream.sshport_id = await this._saveStreamSsh(
                                request.stream.ssh,
                                NginxStreamDestinationType.ssh_l
                            );
                        } catch (e) {
                            return {
                                status: 'error',
                                error: (e as Error).message
                            };
                        }
                        break;
                }
            } else {
                // remove old ssh in -----------------------------------------------------------------------------------
                if (aStream.sshport_id > 0 && aStream.ssh_r_type !== NginxStreamSshR.out) {
                    if (!await this._removeOldSshPort(aStream.sshport_id)) {
                        return {
                            status: 'error',
                            error: 'SSH Server is currently in use, please remove SSH port outgoning link!'
                        };
                    }
                }

                // remove old ssh out ----------------------------------------------------------------------------------

                if (aStream.sshport_id > 0) {
                    aStream.sshport_id = 0;
                }
            }

            aStream = await DBHelper.getDataSource().manager.save(aStream);

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

                    for await (const oldUpstream of tupstreams) {
                        if (!checkUpstreamExistence(oldUpstream.id)) {
                            await upstreamRepository.delete({
                                id: oldUpstream.id
                            });
                        }
                    }
                }

                // update or add new upstreams -------------------------------------------------------------------------
                let index = 0;

                for await (const aUpstream of request.stream.upstreams) {
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
                    aNewUpstream.index = index;

                    await DBHelper.getDataSource().manager.save(aNewUpstream);

                    index++;
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

    /**
     * deleteStreamRoute
     * @param session
     * @param request
     */
    @Post('/json/route/stream/delete')
    public async deleteStreamRoute(
        @Session() session: any,
        @Body() request: RouteStreamDelete
    ): Promise<RouteStreamDeleteResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            if (request.id === 0) {
                return {
                    status: 'error',
                    error: 'id is null!'
                };
            }

            const streamRepository = DBHelper.getRepository(NginxStreamDB);
            const upstreamRepository = DBHelper.getRepository(NginxUpstreamDB);

            const stream = await streamRepository.findOne({
                where: {
                    id: request.id
                }
            });

            if (stream) {
                if (stream.isdefault) {
                    return {
                        status: 'error',
                        error: 'Stream route can not delete, this is a default route!'
                    };
                }

                if (stream.sshport_id > 0) {
                    if (!await this._removeOldSshPort(stream.sshport_id)) {
                        return {
                            status: 'error',
                            error: 'SSH Server is currently in use, please remove Ssh port outgoning link!'
                        };
                    }
                }

                // delete upstreams ------------------------------------------------------------------------------------

                await upstreamRepository.delete({
                    stream_id: stream.id
                });

                // delete stream ---------------------------------------------------------------------------------------

                const result = await streamRepository.delete({
                    id: stream.id
                });

                if (result) {
                    return {
                        status: 'ok'
                    };
                }

                return {
                    status: 'error',
                    error: `stream route can not delete by id: ${request.id}`
                };
            }

            return {
                status: 'error',
                error: `stream route not found by id: ${request.id}`
            };
        }

        return {
            status: 'error',
            error: 'user not login!'
        };
    }

    /**
     * saveHttpRoute
     * @param session
     * @param request
     */
    @Post('/json/route/http/save')
    public async saveHttpRoute(
        @Session() session: any,
        @Body() request: RouteHttpSave
    ): Promise<RouteHttpSaveResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const httpRepository = DBHelper.getRepository(NginxHttpDB);
            const locationRepository = DBHelper.getRepository(NginxLocationDB);

            let aHttp: NginxHttpDB|null = null;

            if (request.http.id > 0) {
                const tHttp = await httpRepository.findOne({
                    where: {
                        id: request.http.id
                    }
                });

                if (tHttp) {
                    aHttp = tHttp;
                }
            }

            const oHttp = await httpRepository.findOne({
                where: {
                    listen_id: request.http.listen_id,
                    domain_id: request.domainid
                }
            });

            if (oHttp) {
                if (!aHttp || aHttp.id !== oHttp.id) {
                    return {
                        status: 'error',
                        error: 'Listen route by domain already in used!'
                    };
                }
            }

            if (aHttp === null) {
                aHttp = new NginxHttpDB();
            }

            aHttp.domain_id = request.domainid;
            aHttp.index = request.http.index;
            aHttp.listen_id = request.http.listen_id;
            aHttp.ssl_enable = request.http.ssl.enable || false;
            aHttp.cert_provider = request.http.ssl.provider || '';
            aHttp.cert_email = request.http.ssl.email || '';
            aHttp.http2_enable = request.http.http2_enable;
            aHttp.x_frame_options = request.http.x_frame_options;

            aHttp = await DBHelper.getDataSource().manager.save(aHttp);

            // remove location -----------------------------------------------------------------------------------------

            const oldLocations = await locationRepository.find({
                where: {
                    http_id: aHttp.id
                }
            });

            if (oldLocations) {
                const checkLocationExistence = (locationId: number): boolean => request.http.locations.some(({id}) => id === locationId);

                for await (const oldLocation of oldLocations) {
                    if (!checkLocationExistence(oldLocation.id)) {
                        await locationRepository.delete({
                            id: oldLocation.id
                        });
                    }
                }
            }

            // update or add new locations -----------------------------------------------------------------------------

            for await (const aLocation of request.http.locations) {
                let aNewLocation: NginxLocationDB | null = null;

                const tLocation = await locationRepository.findOne({
                    where: {
                        id: aLocation.id
                    }
                });

                if (tLocation) {
                    aNewLocation = tLocation;
                }

                if (aNewLocation === null) {
                    aNewLocation = new NginxLocationDB();
                    aNewLocation.http_id = aHttp.id;
                }

                aNewLocation.match = aLocation.match;

                // fill default reset
                aNewLocation.proxy_pass = '';
                aNewLocation.modifier = '';
                aNewLocation.redirect_code = 0;
                aNewLocation.redirect = '';
                aNewLocation.sshport_out_id = 0;
                aNewLocation.sshport_schema = '';
                aNewLocation.auth_enable = aLocation.auth_enable;
                aNewLocation.websocket_enable = aLocation.websocket_enable;
                aNewLocation.host_enable = aLocation.host_enable;
                aNewLocation.host_name = aLocation.host_name;
                aNewLocation.host_name_port = aLocation.host_name_port;
                aNewLocation.xforwarded_scheme_enable = aLocation.xforwarded_scheme_enable;
                aNewLocation.xforwarded_proto_enable = aLocation.xforwarded_proto_enable;
                aNewLocation.xforwarded_for_enable = aLocation.xforwarded_for_enable;
                aNewLocation.xrealip_enable = aLocation.xrealip_enable;

                if (aLocation.proxy_pass !== '') {
                    aNewLocation.proxy_pass = aLocation.proxy_pass;
                } else if (aLocation.redirect) {
                    aNewLocation.redirect_code = aLocation.redirect.code;
                    aNewLocation.redirect = aLocation.redirect.redirect || '';
                } else if (aLocation.ssh) {
                    aNewLocation.sshport_schema = aLocation.ssh.schema || '';
                    aNewLocation.sshport_out_id = aLocation.ssh.id || 0;
                }

                await DBHelper.getDataSource().manager.save(aNewLocation);
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

    /**
     * deleteHttpRoute
     * @param session
     * @param request
     */
    @Post('/json/route/http/delete')
    public async deleteHttpRoute(
        @Session() session: any,
        @Body() request: RouteHttpDelete
    ): Promise<RouteHttpDeleteResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            if (request.id === 0) {
                return {
                    status: 'error',
                    error: 'id is null!'
                };
            }

            const httpRepository = DBHelper.getRepository(NginxHttpDB);
            const locationRepository = DBHelper.getRepository(NginxLocationDB);

            const http = await httpRepository.findOne({
                where: {
                    id: request.id
                }
            });

            if (http) {
                await locationRepository.delete({
                    http_id: http.id
                });

                const result = await httpRepository.delete({
                    id: http.id
                });

                if (result) {
                    return {
                        status: 'ok'
                    };
                }

                return {
                    status: 'error',
                    error: `http route can not delete by id: ${request.id}`
                };
            }

            return {
                status: 'error',
                error: `http route not found by id: ${request.id}`
            };
        }

        return {
            status: 'error',
            error: 'user not login!'
        };
    }

}