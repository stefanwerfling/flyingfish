import * as bcrypt from 'bcrypt';
import {Router} from 'express';
import {DefaultReturn, DefaultRoute, StatusCodes} from 'flyingfish_core';
import {Not} from 'typeorm';
import {ExtractSchemaResultType, Vts} from 'vts';
import {Config} from '../../inc/Config/Config.js';
import {DBHelper} from '../../inc/Db/MariaDb/DBHelper.js';
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
export const SchemaUpStream = Vts.object({
    id: Vts.number(),
    address: Vts.string(),
    port: Vts.number()
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
 * RouteStreamSave
 */
export const SchemaRouteStreamSave = Vts.object({
    domainid: Vts.number(),
    stream: SchemaRouteStream
});

export type RouteStreamSave = ExtractSchemaResultType<typeof SchemaRouteStreamSave>;

/**
 * Location
 */
export const SchemaLocation = Vts.object({
    id: Vts.number(),
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
    xrealip_enable: Vts.boolean()
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
    wellknown_disabled: Vts.boolean()
});

export type RouteHttp = ExtractSchemaResultType<typeof SchemaRouteHttp>;

/**
 * RouteHttpSave
 */
export const SchemaRouteHttpSave = Vts.object({
    domainid: Vts.number(),
    http: SchemaRouteHttp
});

export type RouteHttpSave = ExtractSchemaResultType<typeof SchemaRouteHttpSave>;

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
 * RouteStreamSaveResponse
 */
export type RouteStreamSaveResponse = DefaultReturn;

/**
 * RouteHttpSaveResponse
 */
export type RouteHttpSaveResponse = DefaultReturn;

/**
 * RouteStreamDelete
 */
export const SchemaRouteStreamDelete = Vts.object({
    id: Vts.number()
});

export type RouteStreamDelete = ExtractSchemaResultType<typeof SchemaRouteStreamDelete>;

/**
 * RouteStreamDeleteResponse
 */
export type RouteStreamDeleteResponse = DefaultReturn;

/**
 * RouteHttpDelete
 */
export const SchemaRouteHttpDelete = Vts.object({
    id: Vts.number()
});

export type RouteHttpDelete = ExtractSchemaResultType<typeof SchemaRouteHttpDelete>;

/**
 * RouteHttpDeleteResponse
 */
export type RouteHttpDeleteResponse = DefaultReturn;

/**
 * Route
 */
export class Route extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * getRoutes
     */
    public async getRoutes(): Promise<RoutesResponse> {
        const list: RouteData[] = [];
        const sshportList: RouteSshPort[] = [];

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
                            x_frame_options: thttp.x_frame_options,
                            wellknown_disabled: thttp.wellknown_disabled
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

        if (sshuser) {
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

            if (sshport) {
                return sshport.id;
            }

            throw Error('Can not save ssh port.');
        }

        throw Error('Can not save ssh user');
    }

    /**
     * saveStreamRoute
     * @param data
     */
    public async saveStreamRoute(data: RouteStreamSave): Promise<RouteStreamSaveResponse> {
        // check is listen select ----------------------------------------------------------------------------------

        if (data.stream.listen_id === 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Please select a listen!'
            };
        }

        // check is stream listen and domain already exist ---------------------------------------------------------

        const streamRepository = DBHelper.getRepository(NginxStreamDB);

        const caStream = await streamRepository.countBy({
            listen_id: data.stream.listen_id,
            domain_id: data.domainid,
            id: Not(data.stream.id)
        });

        if (caStream > 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'You can only add one stream by this listen to this domain!'
            };
        }

        // ---------------------------------------------------------------------------------------------------------

        const upstreamRepository = DBHelper.getRepository(NginxUpstreamDB);

        let aStream: NginxStreamDB|null = null;

        if (data.stream.id !== 0) {
            const tStream = await streamRepository.findOne({
                where: {
                    id: data.stream.id
                }
            });

            if (tStream) {
                if (tStream.isdefault) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: `stream can not edit, this is a default route by id: ${data.stream.id}`
                    };
                }

                aStream = tStream;
            } else {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `entry not found by id: ${data.stream.id}`
                };
            }
        }

        if (aStream === null) {
            aStream = new NginxStreamDB();
        }

        aStream.domain_id = data.domainid;
        aStream.listen_id = data.stream.listen_id;
        aStream.alias_name = data.stream.alias_name;
        aStream.index = 0;

        if (data.stream.index > 0) {
            aStream.index = data.stream.index;
        }

        aStream.destination_type = data.stream.destination_type;
        aStream.destination_listen_id = data.stream.destination_listen_id;
        aStream.use_as_default = data.stream.use_as_default;
        aStream.load_balancing_algorithm = data.stream.load_balancing_algorithm;
        aStream.ssh_r_type = NginxStreamSshR.none;
        aStream.sshport_id = 0;

        if (data.stream.ssh) {
            switch (aStream.destination_type) {

                // ssh r -------------------------------------------------------------------------------------------
                case NginxStreamDestinationType.ssh_r:
                    aStream.ssh_r_type = data.stream.ssh_r_type;

                    switch (aStream.ssh_r_type) {

                        // ssh r in --------------------------------------------------------------------------------
                        case NginxStreamSshR.in:
                            try {
                                aStream.sshport_id = await this._saveStreamSsh(
                                    data.stream.ssh,
                                    NginxStreamDestinationType.ssh_r
                                );
                            } catch (e) {
                                return {
                                    statusCode: StatusCodes.INTERNAL_ERROR,
                                    msg: (e as Error).message
                                };
                            }
                            break;

                        // ssh r out -------------------------------------------------------------------------------
                        case NginxStreamSshR.out:
                            aStream.sshport_id = data.stream.ssh.id;
                            break;
                    }

                    break;

                // ssh l -------------------------------------------------------------------------------------------
                case NginxStreamDestinationType.ssh_l:
                    try {
                        aStream.sshport_id = await this._saveStreamSsh(
                            data.stream.ssh,
                            NginxStreamDestinationType.ssh_l
                        );
                    } catch (e) {
                        return {
                            statusCode: StatusCodes.INTERNAL_ERROR,
                            msg: (e as Error).message
                        };
                    }
                    break;
            }
        } else {
            // remove old ssh in -----------------------------------------------------------------------------------
            if (aStream.sshport_id > 0 && aStream.ssh_r_type !== NginxStreamSshR.out) {
                if (!await this._removeOldSshPort(aStream.sshport_id)) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'SSH Server is currently in use, please remove SSH port outgoning link!'
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
        } else if (data.stream.upstreams.length > 0) {
            // remove delete upstreams -----------------------------------------------------------------------------
            const tupstreams = await upstreamRepository.find({
                where: {
                    stream_id: aStream.id
                }
            });

            if (tupstreams) {
                const checkUpstreamExistence = (upstreamId: number): boolean => data.stream.upstreams.some(({id}) => id === upstreamId);

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

            for await (const aUpstream of data.stream.upstreams) {
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
            statusCode: StatusCodes.OK
        };
    }

    /**
     * deleteStreamRoute
     * @param data
     */
    public async deleteStreamRoute(data: RouteStreamDelete): Promise<RouteStreamDeleteResponse> {
        if (data.id === 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'id is null!'
            };
        }

        const streamRepository = DBHelper.getRepository(NginxStreamDB);
        const upstreamRepository = DBHelper.getRepository(NginxUpstreamDB);

        const stream = await streamRepository.findOne({
            where: {
                id: data.id
            }
        });

        if (stream) {
            if (stream.isdefault) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Stream route can not delete, this is a default route!'
                };
            }

            if (stream.sshport_id > 0) {
                if (!await this._removeOldSshPort(stream.sshport_id)) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'SSH Server is currently in use, please remove Ssh port outgoning link!'
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
                    statusCode: StatusCodes.OK
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: `stream route can not delete by id: ${data.id}`
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: `stream route not found by id: ${data.id}`
        };
    }

    /**
     * saveHttpRoute
     * @param data
     */
    public async saveHttpRoute(data: RouteHttpSave): Promise<RouteHttpSaveResponse> {
        // check is listen select ----------------------------------------------------------------------------------

        if (data.http.listen_id === 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Please select a listen!'
            };
        }

        // ---------------------------------------------------------------------------------------------------------

        const httpRepository = DBHelper.getRepository(NginxHttpDB);
        const locationRepository = DBHelper.getRepository(NginxLocationDB);

        let aHttp: NginxHttpDB|null = null;

        if (data.http.id > 0) {
            const tHttp = await httpRepository.findOne({
                where: {
                    id: data.http.id
                }
            });

            if (tHttp) {
                aHttp = tHttp;
            }
        }

        const oHttp = await httpRepository.findOne({
            where: {
                listen_id: data.http.listen_id,
                domain_id: data.domainid
            }
        });

        if (oHttp) {
            if (!aHttp || aHttp.id !== oHttp.id) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Listen route by domain already in used!'
                };
            }
        }

        if (aHttp === null) {
            aHttp = new NginxHttpDB();
        }

        aHttp.domain_id = data.domainid;
        aHttp.index = data.http.index;
        aHttp.listen_id = data.http.listen_id;
        aHttp.ssl_enable = data.http.ssl.enable || false;
        aHttp.cert_provider = data.http.ssl.provider || '';
        aHttp.cert_email = data.http.ssl.email || '';
        aHttp.http2_enable = data.http.http2_enable;
        aHttp.x_frame_options = data.http.x_frame_options;
        aHttp.wellknown_disabled = data.http.wellknown_disabled;

        aHttp = await DBHelper.getDataSource().manager.save(aHttp);

        // remove location -----------------------------------------------------------------------------------------

        const oldLocations = await locationRepository.find({
            where: {
                http_id: aHttp.id
            }
        });

        if (oldLocations) {
            const checkLocationExistence = (locationId: number): boolean => data.http.locations.some(({id}) => id === locationId);

            for await (const oldLocation of oldLocations) {
                if (!checkLocationExistence(oldLocation.id)) {
                    await locationRepository.delete({
                        id: oldLocation.id
                    });
                }
            }
        }

        // update or add new locations -----------------------------------------------------------------------------

        for await (const aLocation of data.http.locations) {
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
            statusCode: StatusCodes.OK
        };
    }

    /**
     * deleteHttpRoute
     * @param data
     */
    public async deleteHttpRoute(data: RouteHttpDelete): Promise<RouteHttpDeleteResponse> {
        if (data.id === 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'id is null!'
            };
        }

        const httpRepository = DBHelper.getRepository(NginxHttpDB);
        const locationRepository = DBHelper.getRepository(NginxLocationDB);

        const http = await httpRepository.findOne({
            where: {
                id: data.id
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
                    statusCode: StatusCodes.OK
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: `http route can not delete by id: ${data.id}`
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: `http route not found by id: ${data.id}`
        };
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/route/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getRoutes());
                }
            }
        );

        this._routes.post(
            '/json/route/stream/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaRouteStreamSave, req.body, res)) {
                        res.status(200).json(await this.saveStreamRoute(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/route/stream/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaRouteStreamDelete, req.body, res)) {
                        res.status(200).json(await this.deleteStreamRoute(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/route/http/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaRouteHttpSave, req.body, res)) {
                        res.status(200).json(await this.saveHttpRoute(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/route/http/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaRouteHttpDelete, req.body, res)) {
                        res.status(200).json(await this.deleteHttpRoute(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}