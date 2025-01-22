import {Ets} from 'ets';
import {
    DomainServiceDB,
    FileHelper,
    Logger,
    NginxHttpDB,
    NginxHttpServiceDB,
    NginxHttpVariableDB,
    NginxHttpVariableServiceDB,
    NginxListenDB,
    NginxListenServiceDB,
    NginxListenVariableDB,
    NginxListenVariableServiceDB,
    NginxLocationDB,
    NginxLocationServiceDB,
    NginxStreamDB,
    NginxStreamServiceDB,
    NginxUpstreamDB,
    NginxUpstreamServiceDB,
    SshPortDB,
    SshPortServiceDB,
    SslCertBundel
} from 'flyingfish_core';
import {
    NginxHttpVariableContextType,
    NginxListenCategory,
    NginxListenProtocol,
    NginxListenTypes,
    NginxListenVariableContextType,
    NginxLocationDestinationTypes,
    NginxStreamDestinationType,
    NginxStreamSshR
} from 'flyingfish_schemas';
import fs from 'fs/promises';
import path from 'path';
import {SchemaErrors} from 'vts';
import {Config} from '../inc/Config/Config.js';
import {NginxHttpAccess as NginxHttpAccessInfluxDB} from '../inc/Db/InfluxDb/Entity/NginxHttpAccess.js';
import {NginxStreamAccess as NginxStreamAccessInfluxDB} from '../inc/Db/InfluxDb/Entity/NginxStreamAccess.js';
import {Context} from '../inc/Nginx/Config/Context.js';
import {If} from '../inc/Nginx/Config/If.js';
import {Listen, ListenDestination, ListenProtocol} from '../inc/Nginx/Config/Listen.js';
import {Location} from '../inc/Nginx/Config/Location.js';
import {Map as NginxMap} from '../inc/Nginx/Config/Map.js';
import {Server as NginxConfServer, ServerXFrameOptions} from '../inc/Nginx/Config/Server.js';
import {Upstream, UpstreamLoadBalancingAlgorithm} from '../inc/Nginx/Config/Upstream.js';
import {NginxHTTPVariables} from '../inc/Nginx/NginxHTTPVariables.js';
import {NginxLogFormatJson, SchemaJsonLogAccessHttp, SchemaJsonLogAccessStream} from '../inc/Nginx/NginxLogFormatJson.js';
import {NginxServer} from '../inc/Nginx/NginxServer.js';
import {NginxStreamServerVariables} from '../inc/Nginx/NginxStreamServerVariables.js';
import {OpenSSL} from '../inc/OpenSSL/OpenSSL.js';
import {SslCertProviders} from '../inc/Provider/SslCertProvider/SslCertProviders.js';
import {NginxControlHttpServer} from '../inc/Server/NginxControlHttpServer.js';
import {Settings} from '../inc/Settings/Settings.js';
import {SysLogServer} from '../inc/SysLogServer/SysLogServer.js';

/**
 * HttpLocationCollect
 */
type HttpLocationCollect = {
    location: NginxLocationDB;
    sshport_out?: SshPortDB;
};

/**
 * HttpSubCollect
 */
type HttpSubCollect = {
    http: NginxHttpDB;
    variables: NginxHttpVariableDB[];
    locations: HttpLocationCollect[];
};

/**
 * HttpCollect
 */
type HttpCollect = {
    listen: NginxListenDB;
    domains: Map<string, HttpSubCollect>;
};

/**
 * StreamSubCollect
 */
type StreamSubCollect = {
    stream: NginxStreamDB;
    upstreams: NginxUpstreamDB[];
    sshport?: SshPortDB;
    destination_listen?: NginxListenDB;
};

/**
 * StreamCollect
 */
type StreamCollect = {
    listen: NginxListenDB;
    listen_stream_server_variables: NginxListenVariableDB[];
    domains: Map<string, StreamSubCollect>;
};

/**
 * The service for nginx config generation.
 */
export class NginxService {

    public static readonly INTERN_SERVER_ADDRESS_ACCESS = '/njs/address_access';
    public static readonly INTERN_SERVER_AUTH_BASIC = '/njs/auth_basic';

    public static readonly LOCATION_STATUS = '/flyingfish_status';

    public static readonly SYSLOG_TAG = 'nginx';

    public static readonly DEFAULT_DOMAIN_NAME = '_';
    public static readonly DEFAULT_IP_LOCAL = '127.0.0.1';
    public static readonly DEFAULT_IP_PUBLIC = '0.0.0.0';
    public static readonly DEFAULT_IP6_PUBLIC = '[::]';
    public static readonly PORT_PROXY_UPSTREAM_BEGIN = 20000;

    /**
     * Ngnix service instance.
     * @member {NginxService|null} Instance of service.
     */
    private static _instance: NginxService | null = null;

    /**
     * Return an instance of nginx service.
     * @returns {NginxService}
     */
    public static getInstance(): NginxService {
        if (NginxService._instance === null) {
            NginxService._instance = new NginxService();
        }

        return NginxService._instance;
    }

    /**
     * Nginx private syslog server for logs controll.
     * @member {SysLogServer|null}
     */
    private _syslog: SysLogServer | null = null;

    /**
     * Nginx privat control server for ip checks
     * @private
     */
    private _control: NginxControlHttpServer | null = null;

    /**
     * Proxy upstream server counter. With port start from {NginxService.PORT_PROXY_UPSTREAM_BEGIN}.
     * @member {number}
     */
    private _proxyUpstreamServer = NginxService.PORT_PROXY_UPSTREAM_BEGIN;

    /**
     * Intern helper methode for generate listen config.
     * @param {NginxConfServer} server - Nginx server config object.
     * @param {NginxListenProtocol} listenProtocol - Listen protocol type.
     * @param {ListenDestination} listenDestination - Listen destination IPv4/Unix.
     * @param {ListenDestination} listenDestinationIp6 - Listen destination IPv6/Unix.
     * @param {boolean} ssl - Use SSL for listen.
     * @param {boolean} http2 - Use http2 for listen.
     * @param {boolean} proxy_protocol - Use proxy protocol for listen.
     * @param {boolean} enable_ip6 - Enable IPv6 support.
     */
    private _addServerListens(
        server: NginxConfServer,
        listenProtocol: NginxListenProtocol,
        listenDestination: ListenDestination,
        listenDestinationIp6: ListenDestination,
        ssl: boolean,
        http2: boolean,
        proxy_protocol: boolean,
        enable_ip6: boolean
    ): void {
        if ((listenProtocol === NginxListenProtocol.tcp) ||
            (listenProtocol === NginxListenProtocol.tcp_udp)
        ) {
            server.addListen(
                new Listen(
                    listenDestination,
                    ssl,
                    http2,
                    proxy_protocol
                )
            );
        }

        if ((listenProtocol === NginxListenProtocol.udp) ||
            (listenProtocol === NginxListenProtocol.tcp_udp)
        ) {
            server.addListen(
                new Listen(
                    listenDestination,
                    ssl,
                    http2,
                    proxy_protocol,
                    ListenProtocol.udp
                )
            );
        }

        if (enable_ip6) {
            if ((listenProtocol === NginxListenProtocol.tcp) ||
                (listenProtocol === NginxListenProtocol.tcp_udp)
            ) {
                server.addListen(
                    new Listen(
                        listenDestinationIp6,
                        ssl,
                        http2,
                        proxy_protocol
                    )
                );
            }

            if ((listenProtocol === NginxListenProtocol.udp) ||
                (listenProtocol === NginxListenProtocol.tcp_udp)
            ) {
                server.addListen(
                    new Listen(
                        listenDestinationIp6,
                        ssl,
                        http2,
                        proxy_protocol,
                        ListenProtocol.udp
                    )
                );
            }
        }
    }

    /**
     * Load settings and generate nginx config to file.
     */
    private async _loadConfig(): Promise<void> {
        const conf = NginxServer.getInstance().getConf();

        if (conf === null) {
            Logger.getLogger().error('Error config object is empty!', {
                class: 'NginxService::_loadConfig'
            });

            return;
        }

        if (process.env.FLYINGFISH_NGINX_MODULE_MODE_DYN) {
            switch (process.env.FLYINGFISH_NGINX_MODULE_MODE_DYN) {
                case '0':
                    break;

                default:
                    conf.addModule('/usr/lib/nginx/modules/ngx_stream_js_module.so');
                    conf.addModule('/usr/lib/nginx/modules/ngx_http_js_module.so');
            }
        }

        conf.resetStream();
        conf.resetHttp();

        // add nginx global variables ----------------------------------------------------------------------------------

        conf.addVariable('daemon', 'off');
        conf.addVariable('worker_processes', 'auto');
        conf.addVariable('pcre_jit', 'on');

        // set nginx events --------------------------------------------------------------------------------------------

        const events = new Context('events');

        events.addVariable('worker_connections', await Settings.getSetting(
            Settings.NGINX_WORKER_CONNECTIONS,
            Settings.NGINX_WORKER_CONNECTIONS_DEFAULT
        ));

        conf.addVariable(events.getName(), events);

        // nginx stream variables --------------------------------------------------------------------------------------

        conf.getStream().addVariable(
            'js_import mainstream from',
            path.join(Config.getInstance().get()!.nginx!.prefix, 'dist/mainstream.js')
        );

        const nginxResolver = await Settings.getSetting(
            Settings.NGINX_RESOLVER,
            Settings.NGINX_RESOLVER_DEFAULT
        );

        conf.getStream().addVariable('resolver', `${nginxResolver} valid=1s`);

        // nginx http variables ----------------------------------------------------------------------------------------

        conf.getHttp().addVariable(
            'js_import mainhttp from',
            path.join(Config.getInstance().get()!.nginx!.prefix, 'dist/mainhttp.js')
        );

        conf.getHttp().addVariable('default_type', 'application/octet-stream');
        conf.getHttp().addVariable('sendfile', 'on');
        conf.getHttp().addVariable('server_tokens', 'off');
        conf.getHttp().addVariable('tcp_nopush', 'on');
        conf.getHttp().addVariable('tcp_nodelay', 'on');
        conf.getHttp().addVariable(
            'client_body_temp_path',
            `${path.join(Config.getInstance().get()!.nginx!.prefix, 'body')} 1 2`
        );

        conf.getHttp().addVariable('keepalive_timeout', '90s');
        conf.getHttp().addVariable('proxy_connect_timeout', '90s');
        conf.getHttp().addVariable('proxy_send_timeout', '90s');
        conf.getHttp().addVariable('proxy_read_timeout', '90s');
        conf.getHttp().addVariable('ssl_prefer_server_ciphers', 'on');
        conf.getHttp().addVariable('gzip', 'on');

        /*
         * conf.getHttp().addVariable('proxy_ignore_client_abort', 'off');
         * conf.getHttp().addVariable('client_max_body_size', '2000m');
         * conf.getHttp().addVariable('server_names_hash_bucket_size', '1024');
         * conf.getHttp().addVariable('proxy_http_version', '1.1');
         * conf.getHttp().addVariable('proxy_set_header Accept-Encoding', '""');
         * conf.getHttp().addVariable('proxy_cache', 'off');
         */

        // vars --------------------------------------------------------------------------------------------------------

        const streamMap: Map<number, StreamCollect> = new Map();
        const httpMap: Map<number, HttpCollect> = new Map();

        // read db -----------------------------------------------------------------------------------------------------

        const listens = await NginxListenServiceDB.getInstance().findAllBy(false);

        for await (const alisten of listens) {
            // read streams by db --------------------------------------------------------------------------------------

            if (alisten.listen_type === NginxListenTypes.stream) {
                const tstreams = await NginxStreamServiceDB.getInstance().findAllByListen(alisten.id);

                for await (const astream of tstreams) {
                    const adomain = await DomainServiceDB.getInstance().findOne(astream.domain_id);

                    if (adomain) {
                        if (!streamMap.has(alisten.listen_port)) {
                            streamMap.set(alisten.listen_port, {
                                listen: alisten,
                                listen_stream_server_variables: [],
                                domains: new Map<string, StreamSubCollect>()
                            });
                        }

                        const mapDomainStreams = streamMap.get(alisten.listen_port);

                        // ---------------------------------------------------------------------------------------------

                        mapDomainStreams!.listen_stream_server_variables =
                            await NginxListenVariableServiceDB.getInstance().findAllBy(
                                alisten.id,
                                NginxListenVariableContextType.stream_server
                            );

                        // ---------------------------------------------------------------------------------------------
                        const streamCollection: StreamSubCollect = {
                            stream: astream,
                            upstreams: []
                        };

                        const upstreams = await NginxUpstreamServiceDB.getInstance().findAllStreams(astream.id);

                        if (upstreams) {
                            streamCollection.upstreams = upstreams;
                        }

                        if (astream.sshport_id > 0) {
                            const sshport = await SshPortServiceDB.getInstance().findOne(astream.sshport_id);

                            if (sshport) {
                                streamCollection.sshport = sshport;
                            }
                        }

                        if (astream.destination_listen_id > 0) {
                            const tlisten = await NginxListenServiceDB.getInstance().findOne(astream.destination_listen_id);

                            if (tlisten) {
                                streamCollection.destination_listen = tlisten;
                            }
                        }

                        mapDomainStreams!.domains.set(adomain.domainname, streamCollection);

                        streamMap.set(alisten.listen_port, mapDomainStreams!);
                    }
                }
            } else if (alisten.listen_type === NginxListenTypes.http) {
                // read http by db -----------------------------------------------------------------------------

                const https = await NginxHttpServiceDB.getInstance().findAllByListen(alisten.id);

                for await (const http of https) {
                    const adomain = await DomainServiceDB.getInstance().findOne(http.domain_id);

                    if (adomain) {
                        if (!httpMap.has(alisten.listen_port)) {
                            httpMap.set(alisten.listen_port, {
                                listen: alisten,
                                domains: new Map<string, HttpSubCollect>()
                            });
                        }

                        const mapDomainHttp = httpMap.get(alisten.listen_port);
                        const httpCollection: HttpSubCollect = {
                            http: http,
                            locations: [],
                            variables: []
                        };

                        // locations -----------------------------------------------------------------------------------

                        const locations = await NginxLocationServiceDB.getInstance().findAllByHttp(http.id);

                        if (locations) {
                            const locationCollects: HttpLocationCollect[] = [];

                            for await (const alocation of locations) {
                                const locationCollect: HttpLocationCollect = {
                                    location: alocation
                                };

                                if (alocation.sshport_out_id > 0) {
                                    const sshport = await SshPortServiceDB.getInstance().findOne(alocation.sshport_out_id);

                                    if (sshport) {
                                        locationCollect.sshport_out = sshport;
                                    }
                                }

                                locationCollects.push(locationCollect);
                            }

                            httpCollection.locations = locationCollects;
                        }

                        // variables -----------------------------------------------------------------------------------

                        const variables = await NginxHttpVariableServiceDB.getInstance().findAllBy(
                            http.id,
                            NginxHttpVariableContextType.server
                        );

                        if (variables) {
                            httpCollection.variables = variables;
                        }

                        // ---------------------------------------------------------------------------------------------

                        mapDomainHttp!.domains.set(adomain.domainname, httpCollection);

                        httpMap.set(alisten.listen_port, mapDomainHttp!);
                    }
                }
            }
        }

        // fill config -------------------------------------------------------------------------------------------------

        // add default intern ssh server -------------------------------------------------------------------------------
        const varNameSshIntern = 'ffus_internsshserver';

        const tSshInternUpstream = new Upstream(varNameSshIntern);
        tSshInternUpstream.addServer({
            address: Config.getInstance().get()!.sshserver!.ip!,
            port: 22,
            weight: 0,
            max_fails: 0,
            fail_timeout: 0
        });

        conf.getStream().addUpstream(tSshInternUpstream);

        // -------------------------------------------------------------------------------------------------------------

        const varNameSshInternProxy = 'ffus_internsshserver_proxy';

        const aServerProxy = new NginxConfServer();

        this._addServerListens(
            aServerProxy,
            NginxListenProtocol.tcp,
            {
                network: {
                    port: this._proxyUpstreamServer,
                    ip: NginxService.DEFAULT_IP_LOCAL
                }
            },
            {
                network: {
                    port: this._proxyUpstreamServer,
                    ip: NginxService.DEFAULT_IP6_PUBLIC
                }
            },
            false,
            false,
            true,
            false
        );

        aServerProxy.addVariable('proxy_pass', `${Config.getInstance().get()!.sshserver!.ip!}:${22}`);

        const tSshInternUpstreamProxy = new Upstream(varNameSshInternProxy);
        tSshInternUpstreamProxy.addServer({
            address: NginxService.DEFAULT_IP_LOCAL,
            port: this._proxyUpstreamServer,
            weight: 0,
            max_fails: 0,
            fail_timeout: 0
        });

        conf.getStream().addUpstream(tSshInternUpstreamProxy);

        this._proxyUpstreamServer++;
        conf.getStream().addServer(aServerProxy);

        // fill upstreams ----------------------------------------------------------------------------------------------

        const tupstreams: string[] = [];

        for (const listenPort of streamMap.keys()) {
            const streamCollects = streamMap.get(listenPort);

            if (streamCollects === undefined) {
                continue;
            }

            const varName = `$ffstream${listenPort}`;
            const aMap = new NginxMap('$ssl_preread_server_name', varName);
            let defaultMapDomain: string | null = null;
            let procMap: NginxMap | null = null;

            const proxyProtocolEnable = streamCollects.listen.proxy_protocol;
            const proxyProtocolInEnable = streamCollects.listen.proxy_protocol_in;

            for await (const domainName of streamCollects.domains.keys()) {
                const streamCollect = streamCollects.domains.get(domainName);

                if (streamCollect === undefined) {
                    continue;
                }

                const tstream = streamCollect.stream;
                let upstreamName = 'ffus_';

                if (tstream.alias_name !== '') {
                    upstreamName += `${tstream.alias_name}_`;
                }

                upstreamName += `${tstream.domain_id}`;

                if (tupstreams.indexOf(upstreamName) === -1) {
                    tupstreams.push(upstreamName);

                    const upStream = new Upstream(upstreamName);
                    upStream.setAlgorithm(tstream.load_balancing_algorithm as UpstreamLoadBalancingAlgorithm);

                    switch (streamCollect.stream.destination_type) {

                        // listen --------------------------------------------------------------------------------------
                        case NginxStreamDestinationType.listen:
                            if (streamCollect.destination_listen) {
                                // fill default listen destination
                                upStream.addServer({
                                    address: NginxService.DEFAULT_IP_LOCAL,
                                    port: streamCollect.destination_listen.listen_port,
                                    weight: 0,
                                    max_fails: 0,
                                    fail_timeout: 0
                                });
                            } else {
                                Logger.getLogger().silly(
                                    'Destination listen not found by domain: %s',
                                    domainName,
                                    {
                                        class: 'NginxService::_loadConfig'
                                    }
                                );
                            }
                            break;

                        // upstream ------------------------------------------------------------------------------------
                        case NginxStreamDestinationType.upstream:
                            if (streamCollect.upstreams.length > 0) {
                                for (const tupstream of streamCollect.upstreams) {
                                    let destination_address = tupstream.destination_address;
                                    let destination_port = tupstream.destination_port;

                                    if (tupstream.proxy_protocol_out) {
                                        const aServer = new NginxConfServer();

                                        this._addServerListens(
                                            aServer,
                                            streamCollects.listen.listen_protocol,
                                            {
                                                network: {
                                                    port: this._proxyUpstreamServer,
                                                    ip: NginxService.DEFAULT_IP_LOCAL
                                                }
                                            },
                                            {
                                                network: {
                                                    port: this._proxyUpstreamServer,
                                                    ip: NginxService.DEFAULT_IP6_PUBLIC
                                                }
                                            },
                                            false,
                                            false,
                                            true,
                                            streamCollects.listen.enable_ipv6
                                        );

                                        aServer.addVariable(
                                            'proxy_pass',
                                            `${tupstream.destination_address}:${tupstream.destination_port}`
                                        );

                                        conf.getStream().addServer(aServer);

                                        destination_address = NginxService.DEFAULT_IP_LOCAL;
                                        destination_port = this._proxyUpstreamServer;
                                        this._proxyUpstreamServer++;
                                    }

                                    upStream.addServer({
                                        address: destination_address,
                                        port: destination_port,
                                        weight: tupstream.weight,
                                        max_fails: tupstream.max_fails,
                                        fail_timeout: tupstream.fail_timeout
                                    });
                                }
                            } else {
                                Logger.getLogger().silly(
                                    'None upstream found by domain: %s',
                                    domainName,
                                    {
                                        class: 'NginxService::_loadConfig'
                                    }
                                );
                            }
                            break;

                        // ssh r ---------------------------------------------------------------------------------------
                        case NginxStreamDestinationType.ssh_r:
                            switch (streamCollect.stream.ssh_r_type) {

                                // ssh r in ----------------------------------------------------------------------------
                                case NginxStreamSshR.in:
                                    upstreamName = varNameSshIntern;

                                    if (streamCollects.listen.proxy_protocol) {
                                        upstreamName = varNameSshInternProxy;
                                    }

                                    upStream.setStreamName(upstreamName);

                                    procMap = new NginxMap('$ssl_preread_protocol', `$ffstreamProc${listenPort}`);
                                    procMap.addVariable('"TLSv1.2"', varName);
                                    procMap.addVariable('"TLSv1.3"', varName);
                                    procMap.addVariable('"TLSv1.1"', varName);
                                    procMap.addVariable('"TLSv1.0"', varName);
                                    procMap.addVariable('default', upstreamName);
                                    break;

                                // ssh r out ---------------------------------------------------------------------------
                                case NginxStreamSshR.out:
                                    if (streamCollect.sshport) {

                                        // eslint-disable-next-line no-case-declarations
                                        let destination_address_out = Config.getInstance().get()!.sshserver!.ip!;
                                        // eslint-disable-next-line no-case-declarations
                                        let destination_port_out = streamCollect.sshport.port;

                                        if (streamCollects.listen.proxy_protocol) {
                                            const aServer = new NginxConfServer();

                                            this._addServerListens(
                                                aServer,
                                                streamCollects.listen.listen_protocol,
                                                {
                                                    network: {
                                                        port: this._proxyUpstreamServer,
                                                        ip: NginxService.DEFAULT_IP_LOCAL
                                                    }
                                                },
                                                {
                                                    network: {
                                                        port: this._proxyUpstreamServer,
                                                        ip: NginxService.DEFAULT_IP6_PUBLIC
                                                    }
                                                },
                                                false,
                                                false,
                                                true,
                                                streamCollects.listen.enable_ipv6
                                            );

                                            aServer.addVariable(
                                                'proxy_pass',
                                                `${destination_address_out}:${destination_port_out}`
                                            );

                                            conf.getStream().addServer(aServer);

                                            destination_address_out = NginxService.DEFAULT_IP_LOCAL;
                                            destination_port_out = this._proxyUpstreamServer;
                                            this._proxyUpstreamServer++;
                                        }

                                        // fill default ssh server
                                        upStream.addServer({
                                            address: destination_address_out,
                                            port: destination_port_out,
                                            weight: 0,
                                            max_fails: 0,
                                            fail_timeout: 0
                                        });
                                    } else {
                                        Logger.getLogger().error(
                                            'Ssh (r) entry (out) is empty by domain: %s, streamid: %d',
                                            domainName,
                                            tstream.id,
                                            {
                                                class: 'NginxService::_loadConfig'
                                            }
                                        );
                                    }
                                    break;

                                default:
                                    Logger.getLogger().error(
                                        'Ssh (r) entry has not type in/out by domain: %s, streamid: %d',
                                        domainName,
                                        tstream.id,
                                        {
                                            class: 'NginxService::_loadConfig'
                                        }
                                    );
                            }
                            break;

                        // ssh l ---------------------------------------------------------------------------------------
                        case NginxStreamDestinationType.ssh_l:
                            if (streamCollect.sshport) {
                                upstreamName = varNameSshIntern;

                                if (streamCollects.listen.proxy_protocol) {
                                    upstreamName = varNameSshInternProxy;
                                }

                                upStream.setStreamName(upstreamName);

                                procMap = new NginxMap('$ssl_preread_protocol', `$ffstreamProc${listenPort}`);
                                procMap.addVariable('"TLSv1.2"', varName);
                                procMap.addVariable('"TLSv1.3"', varName);
                                procMap.addVariable('"TLSv1.1"', varName);
                                procMap.addVariable('"TLSv1.0"', varName);
                                procMap.addVariable('default', upstreamName);
                            } else {
                                Logger.getLogger().error(
                                    'Ssh (l) entry is empty by domain: %s, streamid: %d',
                                    domainName,
                                    tstream.id,
                                    {
                                        class: 'NginxService::_loadConfig'
                                    }
                                );
                            }
                            break;

                        default:
                            // fill default
                            upStream.addServer({
                                address: NginxService.DEFAULT_IP_LOCAL,
                                port: 10080,
                                weight: 0,
                                max_fails: 0,
                                fail_timeout: 0
                            });

                            Logger.getLogger().warn(
                                'Destination type is not set by domain: %s, streamid: %d',
                                domainName,
                                tstream.id,
                                {
                                    class: 'NginxService::_loadConfig'
                                }
                            );
                    }

                    if (!conf.getStream().hashUpstream(upStream.getStreamName())) {
                        if (upStream.countServer() === 0) {
                            Logger.getLogger().warn(
                                'Upstream is without a server destination by  domain: %s, streamid: %d',
                                domainName,
                                tstream.id,
                                {
                                    class: 'NginxService::_loadConfig'
                                }
                            );

                            continue;
                        }

                        conf.getStream().addUpstream(upStream);
                    }
                }

                if (tstream.isdefault || tstream.use_as_default) {
                    defaultMapDomain = upstreamName;
                } else {
                    aMap.addVariable(`${domainName}`, upstreamName);
                }
            }

            if (defaultMapDomain !== null) {
                aMap.addVariable('default', defaultMapDomain);
            }

            conf.getStream().addMap(aMap);

            const aServer = new NginxConfServer();

            conf.getStream().addVariable(
                `log_format ff_s_accesslogs_${streamCollects.listen.id}`,
                `escape=json '${NginxLogFormatJson.generateAccessStream(streamCollects.listen.id)}'`
            );

            if (this._syslog && this._syslog.isRunning()) {
                aServer.addVariable(
                    'access_log',
                    `syslog:server=${this._syslog.getOptions().address}:${this._syslog.getOptions().port},` +
                    `tag=${NginxService.SYSLOG_TAG} ` +
                    `ff_s_accesslogs_${streamCollects.listen.id}`
                );
            }

            // add listens
            this._addServerListens(
                aServer,
                streamCollects.listen.listen_protocol,
                {
                    network: {
                        port: listenPort,
                        ip: ''
                    }
                },
                {
                    network: {
                        port: listenPort,
                        ip: NginxService.DEFAULT_IP6_PUBLIC
                    }
                },
                false,
                false,
                proxyProtocolInEnable,
                streamCollects.listen.enable_ipv6
            );

            if (streamCollects.listen.enable_address_check) {
                aServer.addVariable('set $ff_secret', Config.getInstance().get()!.nginx!.secret ?? '');

                if (this._control) {
                    aServer.addVariable('set $ff_address_access_url', `"http://unix:${this._control.getUnixSocket()}:${NginxService.INTERN_SERVER_ADDRESS_ACCESS}"`);
                } else {
                    Logger.getLogger().error('Nginx control server is not init for INTERN_SERVER_ADDRESS_ACCESS');
                }

                aServer.addVariable('set $ff_listen_id', `${streamCollects.listen.id}`);
                aServer.addVariable('set $ff_logging_level', `${Logger.getLogger().level}`);
                aServer.addVariable('js_access', 'mainstream.accessAddressStream');
            }

            aServer.addVariable('ssl_preread', 'on');

            if (proxyProtocolEnable) {
                aServer.addVariable('proxy_protocol', 'on');
            }

            if (procMap !== null && procMap as NginxMap) {
                const tprocMap: NginxMap = procMap;

                conf.getStream().addMap(tprocMap);
                aServer.addVariable('proxy_pass', tprocMap.getDestinationVar());
            } else {
                aServer.addVariable('proxy_pass', varName);
            }

            // stream server variables ---------------------------------------------------------------------------------

            for (const aVariable of streamCollects.listen_stream_server_variables) {
                if (aVariable.var_value !== '') {
                    switch (aVariable.var_name) {
                        case NginxStreamServerVariables.proxy_timeout:
                            aServer.addVariable(
                                NginxStreamServerVariables.proxy_timeout,
                                `${parseInt(aVariable.var_value, 10) ?? 10}m`
                            );
                            break;

                        case NginxStreamServerVariables.proxy_connect_timeout:
                            aServer.addVariable(
                                NginxStreamServerVariables.proxy_connect_timeout,
                                `${parseInt(aVariable.var_value, 10) ?? 60}s`
                            );
                            break;
                    }
                }
            }

            // ---------------------------------------------------------------------------------------------------------

            conf.getStream().addServer(aServer);
        }

        // -------------------------------------------------------------------------------------------------------------

        for await (const listenPort of httpMap.keys()) {
            const domainHttps = httpMap.get(listenPort);

            if (domainHttps === undefined) {
                continue;
            }

            for await (const domainName of domainHttps.domains.keys()) {
                const httpSubCollect = domainHttps.domains.get(domainName);

                if (httpSubCollect === undefined) {
                    continue;
                }

                const ssl_enable = httpSubCollect.http.ssl_enable;
                const proxyProtocolInEnable = domainHttps.listen.proxy_protocol_in;

                const aServer = new NginxConfServer();

                // log -------------------------------------------------------------------------------------------------

                conf.getHttp().addVariable(
                    `log_format ff_h_accesslogs_${httpSubCollect.http.id}`,
                    `escape=json '${NginxLogFormatJson.generateAccessHttp(httpSubCollect.http.id)}'`
                );

                if (this._syslog && this._syslog.isRunning()) {
                    aServer.addVariable(
                        'access_log',
                        `syslog:server=${this._syslog.getOptions().address}:${this._syslog.getOptions().port},` +
                        `tag=${NginxService.SYSLOG_TAG} ` +
                        `ff_h_accesslogs_${httpSubCollect.http.id}`
                    );
                }

                // secure variables ------------------------------------------------------------------------------------

                aServer.addVariable(NginxHTTPVariables.server_tokens, 'off');

                // variables -------------------------------------------------------------------------------------------

                for (const aVariable of httpSubCollect.variables) {
                    if (aVariable.var_value !== '') {
                        switch (aVariable.var_name) {
                            case NginxHTTPVariables.client_max_body_size:
                                aServer.addVariable(
                                    NginxHTTPVariables.client_max_body_size,
                                    `${parseInt(aVariable.var_value, 10) ?? 1}m`
                                );
                                break;
                        }
                    }
                }

                // ssl use ---------------------------------------------------------------------------------------------

                if (ssl_enable) {
                    const sslCertProviders = new SslCertProviders();
                    const provider = await sslCertProviders.getProvider(httpSubCollect.http.cert_provider);

                    if (provider) {
                        let sslBundel: SslCertBundel | null = null;

                        try {
                            // TODO Wildcard
                            sslBundel = await provider.getCertificationBundel(domainName, {wildcard: false});
                        } catch (eBundel) {
                            Logger.getLogger().error(
                                'Provider get certificate is except: %s',
                                Ets.formate(eBundel, true, true),
                                {
                                    class: 'NginxService::_loadConfig'
                                }
                            );
                        }

                        if (sslBundel === null) {
                            Logger.getLogger().warn(
                                'Certificate bundel not found for Domain \'%s\' and ignore settings.',
                                domainName,
                                {
                                    class: 'NginxService::_loadConfig'
                                }
                            );

                            continue;
                        }

                        aServer.addVariable(NginxHTTPVariables.ssl_protocols, 'TLSv1 TLSv1.1 TLSv1.2');
                        aServer.addVariable(NginxHTTPVariables.ssl_prefer_server_ciphers, 'on');
                        aServer.addVariable(NginxHTTPVariables.ssl_ciphers, '\'' +
                            'ECDHE-ECDSA-AES256-GCM-SHA384:' +
                            'ECDHE-RSA-AES256-GCM-SHA384:' +
                            'ECDHE-ECDSA-CHACHA20-POLY1305:' +
                            'ECDHE-RSA-CHACHA20-POLY1305:' +
                            'ECDHE-ECDSA-AES128-GCM-SHA256:' +
                            'ECDHE-RSA-AES128-GCM-SHA256:' +
                            'ECDHE-ECDSA-AES256-SHA384:' +
                            'ECDHE-RSA-AES256-SHA384:' +
                            'ECDHE-ECDSA-AES128-SHA256:' +
                            'ECDHE-RSA-AES128-SHA256\'');
                        aServer.addVariable(NginxHTTPVariables.ssl_ecdh_curve, 'secp384r1');

                        const dhparam = Config.getInstance().get()?.nginx?.dhparamfile;

                        if (dhparam) {
                            aServer.addVariable(NginxHTTPVariables.ssl_dhparam, dhparam);
                        }

                        aServer.addVariable(NginxHTTPVariables.ssl_session_timeout, '1d');
                        aServer.addVariable(NginxHTTPVariables.ssl_session_cache, 'shared:SSL:50m');
                        aServer.addVariable(NginxHTTPVariables.ssl_session_tickets, 'off');
                        aServer.addVariable(
                            'add_header Strict-Transport-Security',
                            '"max-age=63072000; includeSubdomains; preload"'
                        );
                        aServer.addVariable(NginxHTTPVariables.ssl_stapling, 'on');
                        aServer.addVariable(NginxHTTPVariables.ssl_stapling_verify, 'on');
                        aServer.addVariable(NginxHTTPVariables.ssl_trusted_certificate, sslBundel.chainPem);
                        aServer.addVariable(NginxHTTPVariables.ssl_certificate, sslBundel.fullChainPem);
                        aServer.addVariable(NginxHTTPVariables.ssl_certificate_key, sslBundel.privatKeyPem);
                        aServer.addVariable(NginxHTTPVariables.resolver, `${nginxResolver} valid=300s`);
                        aServer.addVariable(NginxHTTPVariables.resolver_timeout, '5s');

                        switch (httpSubCollect.http.x_frame_options) {
                            case ServerXFrameOptions.deny:
                                aServer.addVariable('add_header X-Frame-Options', ServerXFrameOptions.deny);
                                break;

                            case ServerXFrameOptions.sameorigin:
                                aServer.addVariable('add_header X-Frame-Options', ServerXFrameOptions.sameorigin);
                                break;
                        }

                        aServer.addVariable('add_header X-XSS-Protection', '"1; mode=block"');
                        aServer.addVariable('add_header X-Content-Type-Options', 'nosniff');
                        aServer.addVariable('add_header X-Robots-Tag', 'none');

                        // check the host and server name right
                        const domainIf = new If('$host != $server_name');
                        domainIf.addVariable('return', '444');

                        aServer.addContext(domainIf);

                    } else {
                        Logger.getLogger().warn(
                            'Certificate provider not found for Domain \'%s\' and ignore settings.',
                            domainName,
                            {
                                class: 'NginxService::_loadConfig'
                            }
                        );

                        continue;
                    }

                }

                // listen ----------------------------------------------------------------------------------------------

                if (domainName !== NginxService.DEFAULT_DOMAIN_NAME) {
                    aServer.addListen(new Listen(
                        {
                            network: {
                                port: listenPort,
                                ip: ''
                            }
                        },
                        ssl_enable,
                        false,
                        proxyProtocolInEnable
                    ));

                    if (domainHttps.listen.enable_ipv6) {
                        aServer.addListen(new Listen(
                            {
                                network: {
                                    port: listenPort,
                                    ip: NginxService.DEFAULT_IP6_PUBLIC
                                }
                            },
                            ssl_enable,
                            false,
                            proxyProtocolInEnable
                        ));
                    }

                    aServer.setServerName(domainName);

                    // http2 enable ------------------------------------------------------------------------------------

                    if (ssl_enable && httpSubCollect.http.http2_enable) {
                        aServer.addVariable('http2', 'on');
                    }

                    // well-known --------------------------------------------------------------------------------------

                    if (!ssl_enable && !httpSubCollect.http.wellknown_disabled) {
                        // add as default, when add a redirect; then sample acme not works
                        const acme = new Location('/.well-known/');
                        acme.addVariable('auth_basic', 'off');
                        acme.addVariable('auth_request', 'off');
                        acme.addVariable('default_type', '"text/plain"');
                        acme.addVariable(
                            'alias',
                            path.join(
                                NginxServer.getInstance().getWellKnownPath(),
                                '/'
                            )
                        );

                        aServer.addLocation(acme);
                    }

                    // locations ---------------------------------------------------------------------------------------

                    for await (const locationCollect of httpSubCollect.locations) {
                        const entry = locationCollect.location;
                        let match = entry.match;

                        if (match === '') {
                            match = '/';
                        }

                        const location = new Location(match, entry.modifier);

                        // default proctetions -------------------------------------------------------------------------

                        // Mitigate httpoxy attack
                        location.addVariable('proxy_set_header Proxy', '""');

                        // auth use ------------------------------------------------------------------------------------

                        if (entry.auth_enable) {
                            let releam = domainName;

                            if (entry.auth_relam !== '') {
                                releam = entry.auth_relam;
                            }

                            const dummyHtpasswd = path.join(Config.getInstance().get()!.nginx!.prefix, 'htpasswd');

                            if (!await FileHelper.fileExist(dummyHtpasswd)) {
                                await fs.writeFile(dummyHtpasswd, '');
                            }

                            location.addVariable('satisfy', 'any');
                            location.addVariable('auth_basic', `"${releam}"`);
                            location.addVariable('auth_basic_user_file', dummyHtpasswd);
                            location.addVariable('auth_request', `/auth${entry.id}`);

                            const authLocation = new Location(`/auth${entry.id}`);
                            authLocation.addVariable('internal', '');
                            authLocation.addVariable('set $ff_secret', Config.getInstance().get()!.nginx!.secret ?? '');

                            if (this._control) {
                                authLocation.addVariable('set $ff_auth_basic_url', `"http://unix:${this._control.getUnixSocket()}:${NginxService.INTERN_SERVER_AUTH_BASIC}"`);
                            } else {
                                Logger.getLogger().error('Nginx control server is not init for INTERN_SERVER_AUTH_BASIC');
                            }

                            authLocation.addVariable('set $ff_location_id', `${entry.id}`);
                            authLocation.addVariable('set $ff_logging_level', `${Logger.getLogger().level}`);
                            authLocation.addVariable('set $ff_authheader', '$http_authorization');
                            authLocation.addVariable('js_content', 'mainhttp.authorizeHttp');
                            aServer.addLocation(authLocation);
                        }

                        // proxy header --------------------------------------------------------------------------------

                        if (locationCollect.location.host_enable) {
                            let host = locationCollect.location.host_name.trim();

                            if (host === '') {
                                host = '$host';
                            }

                            if (locationCollect.location.host_name_port !== 0) {
                                host += `:${locationCollect.location.host_name_port}`;
                            }

                            location.addVariable('proxy_set_header Host', host);
                        }

                        if (locationCollect.location.xforwarded_scheme_enable) {
                            location.addVariable('proxy_set_header X-Forwarded-Scheme', '$scheme');
                        }

                        if (locationCollect.location.xforwarded_proto_enable) {
                            location.addVariable('proxy_set_header X-Forwarded-Proto', '$scheme');
                        }

                        if (locationCollect.location.xforwarded_for_enable) {
                            location.addVariable(
                                'proxy_set_header X-Forwarded-For',
                                proxyProtocolInEnable ? '$proxy_protocol_addr' : '$remote_addr'
                            );
                        }

                        if (locationCollect.location.xrealip_enable) {
                            location.addVariable(
                                'proxy_set_header X-Real-IP',
                                proxyProtocolInEnable ? '$proxy_protocol_addr' : '$remote_addr'
                            );
                        }

                        // set destination -----------------------------------------------------------------------------

                        let redirectCode: number;

                        switch (entry.destination_type) {
                            case NginxLocationDestinationTypes.none:
                                continue;

                            // redirect --------------------------------------------------------------------------------
                            case NginxLocationDestinationTypes.redirect:
                                redirectCode = 301;

                                if (entry.redirect_code > 0) {
                                    redirectCode = entry.redirect_code;
                                }

                                location.addVariable(`return ${redirectCode}`, entry.redirect);
                                aServer.addLocation(location);

                                continue;

                            // ssh -------------------------------------------------------------------------------------
                            case NginxLocationDestinationTypes.ssh:
                                if (locationCollect.sshport_out) {
                                    // location.addVariable('proxy_ssl_server_name', 'on');

                                    // location.addVariable('proxy_ssl_protocols', 'SSLv2 SSLv3 TLSv1.2 TLSv1.3');

                                    location.addVariable('proxy_http_version', '1.1');
                                    location.addVariable('proxy_ignore_client_abort', 'on');

                                    location.addVariable(
                                        'proxy_pass',
                                        `${entry.sshport_schema}://${Config.getInstance().get()?.sshserver?.ip}:${locationCollect.sshport_out.port}`
                                    );
                                } else if (entry.proxy_pass) {
                                    location.addVariable('proxy_pass', entry.proxy_pass);
                                }
                                break;

                            // proxypass -------------------------------------------------------------------------------
                            case NginxLocationDestinationTypes.proxypass:
                                location.addVariable('proxy_pass', entry.proxy_pass);
                                break;

                            // dyndns ----------------------------------------------------------------------------------
                            case NginxLocationDestinationTypes.dyndns:
                                if (Config.getInstance().get()?.dyndnsserver &&
                                    Config.getInstance().get()?.dyndnsserver?.enable) {
                                    location.addVariable(
                                        'proxy_pass',
                                        `${Config.getInstance().get()?.dyndnsserver?.schema}://${Config.getInstance().get()?.dyndnsserver?.ip}:${Config.getInstance().get()?.dyndnsserver?.port}`
                                    );

                                    location.addVariable(
                                        'more_set_input_headers \'Authorization:',
                                        '$http_authorization\''
                                    );

                                    location.addVariable(
                                        'more_set_headers -s 401 \'WWW-Authenticate:',
                                        'Basic realm="FlyingFish DynDNS-Server"\''
                                    );
                                } else {
                                    Logger.getLogger().warn(
                                        'DynDnsServer setting not enabled., domain: \'%s\'',
                                        domainName,
                                        {
                                            class: 'NginxService::_loadConfig'
                                        }
                                    );
                                }
                                break;

                            // vpn -------------------------------------------------------------------------------------
                            case NginxLocationDestinationTypes.vpn:
                                Logger.getLogger().info('Soon in development', {
                                    class: 'NginxService::_loadConfig'
                                });
                                break;
                        }

                        // websocket use -------------------------------------------------------------------------------

                        if (locationCollect.location.websocket_enable) {
                            location.addVariable('proxy_set_header Upgrade', '$http_upgrade');
                            location.addVariable('proxy_set_header Connection', '$http_connection');
                            location.addVariable('proxy_http_version', '1.1');
                        }

                        aServer.addLocation(location);
                    }

                    conf.getHttp().addServer(aServer);
                }
            }
        }

        // set status server -------------------------------------------------------------------------------------------

        const statusListen = await NginxListenServiceDB.getInstance().findByType(
            NginxListenTypes.http,
            NginxListenCategory.status
        );

        if (statusListen) {
            const sServer = new NginxConfServer();
            sServer.addListen(new Listen(
                {
                    network: {
                        port: statusListen.listen_port,
                        ip: NginxService.DEFAULT_IP_LOCAL
                    }
                },
                false,
                false,
                false,
                ListenProtocol.none,
                true
            ));

            const locStatus = new Location(NginxService.LOCATION_STATUS);
            locStatus.addVariable('stub_status', 'on');
            locStatus.addVariable('access_log', 'off');
            locStatus.addVariable('allow', NginxService.DEFAULT_IP_LOCAL);
            locStatus.addVariable('deny', 'all');
            sServer.addLocation(locStatus);

            conf.getHttp().addServer(sServer);
        }

        // set default server ------------------------------------------------------------------------------------------

        const defaultListen = await NginxListenServiceDB.getInstance().findByType(
            NginxListenTypes.http,
            NginxListenCategory.default_http
        );

        if (defaultListen) {

            const dServer = new NginxConfServer();
            dServer.addListen(new Listen(
                {
                    network: {
                        port: defaultListen.listen_port,
                        ip: ''
                    }
                },
                false,
                false,
                defaultListen.proxy_protocol_in,
                ListenProtocol.none,
                true
            ));

            conf.getHttp().addVariable(
                'log_format ff_h_accesslogs_0',
                `escape=json '${NginxLogFormatJson.generateAccessHttp(0)}'`
            );

            if (this._syslog && this._syslog.isRunning()) {
                dServer.addVariable(
                    'access_log',
                    `syslog:server=${this._syslog.getOptions().address}:${this._syslog.getOptions().port},` +
                    `tag=${NginxService.SYSLOG_TAG} ` +
                    'ff_h_accesslogs_0'
                );
            }

            dServer.addErrorPage({
                code: '500 502 503 504',
                uri: '/50x.html'
            });

            dServer.addErrorPage({
                code: '404',
                uri: '/404.html'
            });

            const locWellKnown = new Location('/.well-known/');

            locWellKnown.addVariable('auth_basic', 'off');
            locWellKnown.addVariable('auth_request', 'off');
            locWellKnown.addVariable('default_type', '"text/plain"');
            locWellKnown.addVariable('alias', path.join(NginxServer.getInstance().getWellKnownPath(), '/'));

            dServer.addLocation(locWellKnown);

            const loc404 = new Location('/404.html');
            loc404.addVariable('root', NginxServer.getInstance().getPagesPath());
            loc404.addVariable('internal', '');
            dServer.addLocation(loc404);

            conf.getHttp().addServer(dServer);
        }
    }

    /**
     * _startSysLog
     * @protected
     */
    protected _startSysLog(): void {
        this._syslog = new SysLogServer();
        this._syslog.setOnListen((sysLogServer) => {
            Logger.getLogger().info(
                'Liste started on: %s:%d',
                sysLogServer.getOptions().address,
                sysLogServer.getOptions().port,
                {
                    class: 'NginxService::_startSysLog::SysLogServer::setOnListen'
                }
            );
        });

        this._syslog.setOnError((
            _sysLogServer,
            err
        ) => {
            Logger.getLogger().error('Syslog error', {
                error: err,
                class: 'NginxService::_startSysLog::SysLogServer::setOnError'
            });
        });

        this._syslog.setOnMessage((
            _sysLogServer,
            msg
        ) => {
            Logger.getLogger().silly(
                '%s',
                msg.toString(), 
                {
                    class: 'NginxService::_startSysLog::SysLogServer::setOnMessage'
                }
            );

            const parts = msg.toString().split(`${NginxService.SYSLOG_TAG}: `);

            try {
                const nginxLog = JSON.parse(parts[1]);

                if (nginxLog.source_type) {
                    const errors: SchemaErrors = [];

                    if (nginxLog.source_type === 'stream') {
                        if (SchemaJsonLogAccessStream.validate(nginxLog, errors)) {
                            NginxStreamAccessInfluxDB.addLog(nginxLog);
                        } else {
                            Logger.getLogger().error('Validation error SchemaJsonLogAccessStream:', {
                                class: 'NginxService::_startSysLog::SysLogServer::setOnMessage:stream',
                                errors: JSON.stringify(errors, null, 2)
                            });
                        }
                    } else if (nginxLog.source_type === 'http') {
                        if (SchemaJsonLogAccessHttp.validate(nginxLog, errors)) {
                            NginxHttpAccessInfluxDB.addLog(nginxLog);
                        } else {
                            Logger.getLogger().error('Validation error SchemaJsonLogAccessHttp:', {
                                class: 'NginxService::_startSysLog::SysLogServer::setOnMessage',
                                errors: JSON.stringify(errors, null, 2)
                            });
                        }
                    }
                }
            } catch (error) {
                Logger.getLogger().error('Exception:', {
                    class: 'NginxService::_startSysLog::SysLogServer::setOnMessage'
                });

                if (error instanceof Error) {
                    Logger.getLogger().error(error.message, {
                        class: 'NginxService::_startSysLog::SysLogServer::setOnMessage'
                    });
                } else {
                    console.log(error);
                }

                Logger.getLogger().error(JSON.stringify(error, null, 2), {
                    class: 'NginxService::_startSysLog::SysLogServer::setOnMessage'
                });
            }
        });

        this._syslog.listen();
    }

    protected async _startControl(): Promise<void> {
        this._control = new NginxControlHttpServer();
        await this._control.listen();
    }

    /**
     * start
     */
    public async start(): Promise<void> {
        const dhparam = Config.getInstance().get()?.nginx?.dhparamfile;

        if (dhparam) {
            if (await FileHelper.fileExist(dhparam)) {
                Logger.getLogger().info('Dhparam found.', {
                    class: 'NginxService::start'
                });
            } else {
                Logger.getLogger().info('Create Dhparam ...', {
                    class: 'NginxService::start'
                });

                await fs.mkdir(path.dirname(dhparam), {recursive: true});

                if (await OpenSSL.createDhparam(dhparam, 4096) === null) {
                    Logger.getLogger().warn('Can not create Dhparam!', {
                        class: 'NginxService::start'
                    });
                } else {
                    Logger.getLogger().info('Dhparam finish.', {
                        class: 'NginxService::start'
                    });
                }
            }
        }

        this._startSysLog();
        await this._startControl();
        await this._loadConfig();
        NginxServer.getInstance().start();

        if (NginxServer.getInstance().isRun()) {
            Logger.getLogger().info('Nginx server is start', {
                class: 'NginxService::start'
            });
        }
    }

    /**
     * stop
     * @param forced
     */
    public async stop(forced: boolean = false): Promise<void> {
        Logger.getLogger().info(`Nginx stop with forced: ${forced}`, {
            class: 'NginxService::stop'
        });

        if (NginxServer.getInstance().isRun()) {
            NginxServer.getInstance().stop();
        } else if (forced) {
            NginxServer.getInstance().stop();
        }
    }

    /**
     * reload
     */
    public async reload(): Promise<void> {
        await this._loadConfig();

        if (await NginxServer.getInstance().testConfig()) {
            Logger.getLogger().error('Nginx server config has a error!', {
                class: 'NginxService::reload'
            });
        }

        NginxServer.getInstance().reload();

        if (NginxServer.getInstance().isRun()) {
            Logger.getLogger().info('Nginx server is reload', {
                class: 'NginxService::reload'
            });
        }
    }

}