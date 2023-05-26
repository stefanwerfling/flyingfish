import {Logger} from 'flyingfish_core';
import fs from 'fs';
import * as Path from 'path';
import {SchemaErrors} from 'vts';
import {Config} from '../Config/Config.js';
import {NginxHttpAccess as NginxHttpAccessInfluxDB} from '../Db/InfluxDb/Entity/NginxHttpAccess.js';
import {NginxStreamAccess as NginxStreamAccessInfluxDB} from '../Db/InfluxDb/Entity/NginxStreamAccess.js';
import {DBHelper} from '../Db/MariaDb/DBHelper.js';
import {DomainService} from '../Db/MariaDb/DomainService.js';
import {NginxHttp as NginxHttpDB} from '../Db/MariaDb/Entity/NginxHttp.js';
import {
    NginxHttpVariable as NginxHttpVariableDB,
    NginxHttpVariableContextType
} from '../Db/MariaDb/Entity/NginxHttpVariable.js';
import {
    ListenCategory,
    ListenProtocol as ListenProtocolDB,
    ListenTypes,
    NginxListen as NginxListenDB
} from '../Db/MariaDb/Entity/NginxListen.js';
import {NginxLocation as NginxLocationDB} from '../Db/MariaDb/Entity/NginxLocation.js';
import {
    NginxStream as NginxStreamDB,
    NginxStreamDestinationType,
    NginxStreamSshR
} from '../Db/MariaDb/Entity/NginxStream.js';
import {NginxUpstream as NginxUpstreamDB} from '../Db/MariaDb/Entity/NginxUpstream.js';
import {SshPort as SshPortDB} from '../Db/MariaDb/Entity/SshPort.js';
import {Context} from '../Nginx/Config/Context.js';
import {If} from '../Nginx/Config/If.js';
import {Listen, ListenProtocol} from '../Nginx/Config/Listen.js';
import {Location} from '../Nginx/Config/Location.js';
import {Map as NginxMap} from '../Nginx/Config/Map.js';
import {Server as NginxConfServer, ServerXFrameOptions} from '../Nginx/Config/Server.js';
import {Upstream, UpstreamLoadBalancingAlgorithm} from '../Nginx/Config/Upstream.js';
import {NginxLogFormatJson, SchemaJsonLogAccessHttp, SchemaJsonLogAccessStream} from '../Nginx/NginxLogFormatJson.js';
import {NginxServer} from '../Nginx/NginxServer.js';
import {NginxHTTPVariables} from '../Nginx/NginxVariables.js';
import {OpenSSL} from '../OpenSSL/OpenSSL.js';
import {Certbot} from '../Provider/Letsencrypt/Certbot.js';
import {Settings} from '../Settings/Settings.js';
import {SysLogServer} from '../SysLogServer/SysLogServer.js';

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
    domains: Map<string, StreamSubCollect>;
};

/**
 * NginxService
 */
export class NginxService {

    public static readonly INTERN_SERVER_ADDRESS_ACCESS = 'https://127.0.0.1:3000/njs/address_access';
    public static readonly INTERN_SERVER_AUTH_BASIC = 'https://127.0.0.1:3000/njs/auth_basic';

    public static readonly LOCATION_STATUS = '/flyingfish_status';

    public static readonly SYSLOG_TAG = 'nginx';

    public static readonly DEFAULT_DOMAIN_NAME = '_';
    public static readonly DEFAULT_IP_LOCAL = '127.0.0.1';
    public static readonly DEFAULT_IP_PUBLIC = '0.0.0.0';
    public static readonly DEFAULT_IP6_PUBLIC = '[::]';
    public static readonly PORT_PROXY_UPSTREAM_BEGIN = 20000;

    /**
     * ngnix service instance
     * @private
     */
    private static _instance: NginxService|null = null;

    /**
     * getInstance
     */
    public static getInstance(): NginxService {
        if (NginxService._instance === null) {
            NginxService._instance = new NginxService();
        }

        return NginxService._instance;
    }

    /**
     * nginx private syslog server for logs controll
     * @private
     */
    private _syslog: SysLogServer | null = null;

    /**
     * _proxyUpstreamServer
     * @private
     */
    private _proxyUpstreamServer = NginxService.PORT_PROXY_UPSTREAM_BEGIN;

    /**
     * _loadConfig
     * @private
     */
    private async _loadConfig(): Promise<void> {
        const conf = NginxServer.getInstance().getConf();

        if (conf === null) {
            Logger.getLogger().error('NginxService::_loadConfig: Erro config object is empty!');
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

        conf.getStream().addVariable('js_import mainstream from', '/opt/app/nginx/dist/mainstream.js');

        const nginxResolver = await Settings.getSetting(
            Settings.NGINX_RESOLVER,
            Settings.NGINX_RESOLVER_DEFAULT
        );

        conf.getStream().addVariable('resolver', `${nginxResolver} valid=1s`);

        // nginx http variables ----------------------------------------------------------------------------------------

        conf.getHttp().addVariable('js_import mainhttp from', '/opt/app/nginx/dist/mainhttp.js');
        conf.getHttp().addVariable('default_type', 'application/octet-stream');
        conf.getHttp().addVariable('sendfile', 'on');
        conf.getHttp().addVariable('server_tokens', 'off');
        conf.getHttp().addVariable('tcp_nopush', 'on');
        conf.getHttp().addVariable('tcp_nodelay', 'on');
        conf.getHttp().addVariable('client_body_temp_path', '/opt/app/nginx/body 1 2');
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

        const listenRepository = DBHelper.getRepository(NginxListenDB);
        const streamRepository = DBHelper.getRepository(NginxStreamDB);
        const upstreamRepository = DBHelper.getRepository(NginxUpstreamDB);
        const httpRepository = DBHelper.getRepository(NginxHttpDB);
        const httpVariableRepository = DBHelper.getRepository(NginxHttpVariableDB);
        const locationRepository = DBHelper.getRepository(NginxLocationDB);
        const sshportRepository = DBHelper.getRepository(SshPortDB);

        const listens = await listenRepository.find({
            where: {
                disable: false
            }
        });

        for await (const alisten of listens) {
            // read streams by db --------------------------------------------------------------------------------------

            if (alisten.listen_type === ListenTypes.stream) {
                const tstreams = await streamRepository.find({
                    where: {
                        listen_id: alisten.id
                    }
                });

                for await (const astream of tstreams) {
                    const adomain = await DomainService.findOne(astream.domain_id);

                    if (adomain) {
                        if (!streamMap.has(alisten.listen_port)) {
                            streamMap.set(alisten.listen_port, {
                                listen: alisten,
                                domains: new Map<string, StreamSubCollect>()
                            });
                        }

                        const mapDomainStreams = streamMap.get(alisten.listen_port);
                        const streamCollection: StreamSubCollect = {
                            stream: astream,
                            upstreams: []
                        };

                        const upstreams = await upstreamRepository.find({
                            where: {
                                stream_id: astream.id
                            }
                        });

                        if (upstreams) {
                            streamCollection.upstreams = upstreams;
                        }

                        if (astream.sshport_id > 0) {
                            const sshport = await sshportRepository.findOne({
                                where: {
                                    id: astream.sshport_id
                                }
                            });

                            if (sshport) {
                                streamCollection.sshport = sshport;
                            }
                        }

                        if (astream.destination_listen_id > 0) {
                            const tlisten = await listenRepository.findOne({
                                where: {
                                    id: astream.destination_listen_id
                                }
                            });

                            if (tlisten) {
                                streamCollection.destination_listen = tlisten;
                            }
                        }

                        mapDomainStreams!.domains.set(adomain.domainname, streamCollection);

                        streamMap.set(alisten.listen_port, mapDomainStreams!);
                    }
                }
            } else if (alisten.listen_type === ListenTypes.http) {
                // read http by db -----------------------------------------------------------------------------

                const https = await httpRepository.find({
                    where: {
                        listen_id: alisten.id
                    }
                });

                for await (const http of https) {
                    const adomain = await DomainService.findOne(http.domain_id);

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

                        const locations = await locationRepository.find({
                            where: {
                                http_id: http.id
                            }
                        });

                        if (locations) {
                            const locationCollects: HttpLocationCollect[] = [];

                            for await (const alocation of locations) {
                                const locationCollect: HttpLocationCollect = {
                                    location: alocation
                                };

                                if (alocation.sshport_out_id > 0) {
                                    const sshport = await sshportRepository.findOne({
                                        where: {
                                            id: alocation.sshport_out_id
                                        }
                                    });

                                    if (sshport) {
                                        locationCollect.sshport_out = sshport;
                                    }
                                }

                                locationCollects.push(locationCollect);
                            }

                            httpCollection.locations = locationCollects;
                        }

                        // variables -----------------------------------------------------------------------------------

                        const variables = await httpVariableRepository.find({
                            where: {
                                http_id: http.id,
                                context_type: NginxHttpVariableContextType.server
                            }
                        });

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

        const tupstreams: string[] = [];

        for (const listenPort of streamMap.keys()) {
            const streamCollects = streamMap.get(listenPort);

            if (streamCollects === undefined) {
                continue;
            }

            const varName = `$ffstream${listenPort}`;
            const aMap = new NginxMap('$ssl_preread_server_name', varName);
            let defaultMapDomain: string|null = null;
            let procMap: NginxMap|null = null;

            const proxyProtocolEnable = streamCollects.listen.proxy_protocol;
            const proxyProtocolInEnable = streamCollects.listen.proxy_protocol_in;

            for (const domainName of streamCollects.domains.keys()) {
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
                                    `NginxService::_loadConfig: destination listen not found by domain: ${domainName}`
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

                                        if ((streamCollects.listen.listen_protocol === ListenProtocolDB.tcp) ||
                                            (streamCollects.listen.listen_protocol === ListenProtocolDB.tcp_udp)) {
                                            aServer.addListen(
                                                new Listen(
                                                    this._proxyUpstreamServer,
                                                    NginxService.DEFAULT_IP_LOCAL,
                                                    false,
                                                    false,
                                                    true
                                                )
                                            );
                                        }

                                        if ((streamCollects.listen.listen_protocol === ListenProtocolDB.udp) ||
                                            (streamCollects.listen.listen_protocol === ListenProtocolDB.tcp_udp)) {
                                            aServer.addListen(
                                                new Listen(
                                                    this._proxyUpstreamServer,
                                                    NginxService.DEFAULT_IP_LOCAL,
                                                    false,
                                                    false,
                                                    true,
                                                    ListenProtocol.udp
                                                )
                                            );
                                        }

                                        aServer.addVariable('proxy_pass', `${tupstream.destination_address}:${tupstream.destination_port}`);

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
                                    `NginxService::_loadConfig: None upstream found by domain: ${domainName}`
                                );
                            }
                            break;

                        // ssh r ---------------------------------------------------------------------------------------
                        case NginxStreamDestinationType.ssh_r:
                            switch (streamCollect.stream.ssh_r_type) {

                                // ssh r in ----------------------------------------------------------------------------
                                case NginxStreamSshR.in:
                                    upstreamName = 'ffus_internsshserver';
                                    upStream.setStreamName(upstreamName);

                                    procMap = new NginxMap('$ssl_preread_protocol', `$ffstreamProc${listenPort}`);
                                    procMap.addVariable('"TLSv1.2"', varName);
                                    procMap.addVariable('"TLSv1.3"', varName);
                                    procMap.addVariable('"TLSv1.1"', varName);
                                    procMap.addVariable('"TLSv1.0"', varName);
                                    procMap.addVariable('default', upstreamName);

                                    // fill default ssh server
                                    upStream.addServer({
                                        address: Config.getInstance().get()?.sshserver?.ip!,
                                        port: 22,
                                        weight: 0,
                                        max_fails: 0,
                                        fail_timeout: 0
                                    });
                                    break;

                                // ssh r out ---------------------------------------------------------------------------
                                case NginxStreamSshR.out:
                                    if (streamCollect.sshport) {
                                        // fill default ssh server
                                        upStream.addServer({
                                            address: Config.getInstance().get()?.sshserver?.ip!,
                                            port: streamCollect.sshport.port,
                                            weight: 0,
                                            max_fails: 0,
                                            fail_timeout: 0
                                        });
                                    } else {
                                        Logger.getLogger().error(
                                            `NginxService::_loadConfig: Ssh (r) entry (out) is empty by domain: ${domainName}, streamid: ${tstream.id}`
                                        );
                                    }
                                    break;

                                default:
                                    Logger.getLogger().error(
                                        `NginxService::_loadConfig: Ssh (r) entry has not type in/out by domain: ${domainName}, streamid: ${tstream.id}`
                                    );
                            }
                            break;

                        // ssh l ---------------------------------------------------------------------------------------
                        case NginxStreamDestinationType.ssh_l:
                            if (streamCollect.sshport) {
                                upstreamName = 'ffus_internsshserver';
                                upStream.setStreamName(upstreamName);

                                procMap = new NginxMap('$ssl_preread_protocol', `$ffstreamProc${listenPort}`);
                                procMap.addVariable('"TLSv1.2"', varName);
                                procMap.addVariable('"TLSv1.3"', varName);
                                procMap.addVariable('"TLSv1.1"', varName);
                                procMap.addVariable('"TLSv1.0"', varName);
                                procMap.addVariable('default', upstreamName);

                                // fill default ssh server
                                upStream.addServer({
                                    address: Config.getInstance().get()?.sshserver?.ip!,
                                    port: 22,
                                    weight: 0,
                                    max_fails: 0,
                                    fail_timeout: 0
                                });
                            } else {
                                Logger.getLogger().error(
                                    `NginxService::_loadConfig: Ssh (l) entry is empty by domain: ${domainName}, streamid: ${tstream.id}`
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
                                `NginxService::_loadConfig: destination type is not set by domain: ${domainName}, streamid: ${tstream.id}`
                            );
                    }

                    if (upStream.countServer() === 0) {
                        Logger.getLogger().warn(
                            `NginxService::_loadConfig: upstream is without a server destination by  domain: ${domainName}, streamid: ${tstream.id}`
                        );

                        continue;
                    }

                    if (!conf.getStream().hashUpstream(upStream.getStreamName())) {
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

            conf.getStream().addVariable(`log_format ff_s_accesslogs_${streamCollects.listen.id}`,
                `escape=json '${NginxLogFormatJson.generateAccessStream(streamCollects.listen.id)}'`);

            if (this._syslog && this._syslog.isRunning()) {
                aServer.addVariable(
                    'access_log',
                    `syslog:server=${this._syslog.getOptions().address}:${this._syslog.getOptions().port},` +
                    `tag=${NginxService.SYSLOG_TAG} ` +
                    `ff_s_accesslogs_${streamCollects.listen.id}`
                );
            }

            if ((streamCollects.listen.listen_protocol === ListenProtocolDB.tcp) ||
                (streamCollects.listen.listen_protocol === ListenProtocolDB.tcp_udp)) {
                aServer.addListen(
                    new Listen(
                        listenPort,
                        '',
                        false,
                        false,
                        proxyProtocolInEnable
                    )
                );
            }

            if ((streamCollects.listen.listen_protocol === ListenProtocolDB.udp) ||
                (streamCollects.listen.listen_protocol === ListenProtocolDB.tcp_udp)) {
                aServer.addListen(
                    new Listen(
                        listenPort,
                        '',
                        false,
                        false,
                        proxyProtocolInEnable,
                        ListenProtocol.udp
                    )
                );
            }

            if (streamCollects.listen.enable_ipv6) {
                if ((streamCollects.listen.listen_protocol === ListenProtocolDB.tcp) ||
                    (streamCollects.listen.listen_protocol === ListenProtocolDB.tcp_udp)) {
                    aServer.addListen(
                        new Listen(
                            listenPort,
                            NginxService.DEFAULT_IP6_PUBLIC,
                            false,
                            false,
                            proxyProtocolInEnable
                        )
                    );
                }

                if ((streamCollects.listen.listen_protocol === ListenProtocolDB.udp) ||
                    (streamCollects.listen.listen_protocol === ListenProtocolDB.tcp_udp)) {
                    aServer.addListen(
                        new Listen(
                            listenPort,
                            NginxService.DEFAULT_IP6_PUBLIC,
                            false,
                            false,
                            proxyProtocolInEnable,
                            ListenProtocol.udp
                        )
                    );
                }
            }

            if (streamCollects.listen.enable_address_check) {
                aServer.addVariable('set $ff_secret', Config.getInstance().get()!.nginx!.secret ?? '');
                aServer.addVariable('set $ff_address_access_url', NginxService.INTERN_SERVER_ADDRESS_ACCESS);
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
                                aServer.addVariable(NginxHTTPVariables.client_max_body_size, `${parseInt(aVariable.var_value, 10) ?? 1}m`);
                                break;
                        }
                    }
                }

                // ssl use ---------------------------------------------------------------------------------------------

                if (ssl_enable) {
                    const sslCert = await Certbot.existCertificate(domainName);

                    if (sslCert) {
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
                        aServer.addVariable('add_header Strict-Transport-Security', '"max-age=63072000; includeSubdomains; preload"');
                        aServer.addVariable(NginxHTTPVariables.ssl_stapling, 'on');
                        aServer.addVariable(NginxHTTPVariables.ssl_stapling_verify, 'on');
                        aServer.addVariable(NginxHTTPVariables.ssl_trusted_certificate, `${sslCert}/chain.pem`);
                        aServer.addVariable(NginxHTTPVariables.ssl_certificate, `${sslCert}/fullchain.pem`);
                        aServer.addVariable(NginxHTTPVariables.ssl_certificate_key, `${sslCert}/privkey.pem`);
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

                        // check is host and server name right
                        const domainIf = new If('$host != $server_name');
                        domainIf.addVariable('return', '444');

                        aServer.addContext(domainIf);
                    } else {
                        Logger.getLogger().warn(`NginxService::_loadConfig: Certificat for Domain '${domainName}' not found and ignore settings.`);
                        continue;
                    }
                }

                // listen ----------------------------------------------------------------------------------------------

                if (domainName !== NginxService.DEFAULT_DOMAIN_NAME) {
                    aServer.addListen(new Listen(
                        listenPort,
                        '',
                        ssl_enable,
                        ssl_enable ? httpSubCollect.http.http2_enable : false,
                        proxyProtocolInEnable
                    ));

                    if (domainHttps.listen.enable_ipv6) {
                        aServer.addListen(new Listen(
                            listenPort,
                            NginxService.DEFAULT_IP6_PUBLIC,
                            ssl_enable,
                            ssl_enable ? httpSubCollect.http.http2_enable : false,
                            proxyProtocolInEnable
                        ));
                    }

                    aServer.setServerName(domainName);

                    // well-known --------------------------------------------------------------------------------------

                    if (!ssl_enable && !httpSubCollect.http.wellknown_disabled) {
                        // add as default, when add a redirect, then acme not work
                        const acme = new Location('/.well-known/acme-challenge/');
                        acme.addVariable('auth_basic', 'off');
                        acme.addVariable('auth_request', 'off');
                        acme.addVariable('default_type', '"text/plain"');
                        acme.addVariable('alias', '/opt/app/nginx/html/.well-known/acme-challenge/');

                        aServer.addLocation(acme);
                    }

                    // locations ---------------------------------------------------------------------------------------

                    for (const locationCollect of httpSubCollect.locations) {
                        const entry = locationCollect.location;
                        let match = entry.match;

                        if (match === '') {
                            match = '/';
                        }

                        const location = new Location(match, entry.modifier);

                        // default proctetions -------------------------------------------------------------------------

                        // Mitigate httpoxy attack
                        location.addVariable('proxy_set_header Proxy', '""');

                        // redirect ------------------------------------------------------------------------------------

                        if (entry.redirect !== '') {
                            let redirectCode = 301;

                            if (entry.redirect_code > 0) {
                                redirectCode = entry.redirect_code;
                            }

                            location.addVariable(`return ${redirectCode}`, entry.redirect);
                            aServer.addLocation(location);

                            continue;
                        }

                        // auth use ------------------------------------------------------------------------------------

                        if (entry.auth_enable) {
                            let releam = domainName;

                            if (entry.auth_relam !== '') {
                                releam = entry.auth_relam;
                            }

                            const dummyHtpasswd = '/opt/app/nginx/htpasswd';

                            if (!fs.existsSync(dummyHtpasswd)) {
                                fs.writeFileSync(dummyHtpasswd, '');
                            }

                            location.addVariable('satisfy', 'any');
                            location.addVariable('auth_basic', `"${releam}"`);
                            location.addVariable('auth_basic_user_file', dummyHtpasswd);
                            location.addVariable('auth_request', `/auth${entry.id}`);

                            const authLocation = new Location(`/auth${entry.id}`);
                            authLocation.addVariable('internal', '');
                            authLocation.addVariable('set $ff_secret', Config.getInstance().get()!.nginx!.secret ?? '');
                            authLocation.addVariable('set $ff_auth_basic_url', NginxService.INTERN_SERVER_AUTH_BASIC);
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
                            location.addVariable('proxy_set_header X-Forwarded-For', '$remote_addr');
                        }

                        if (locationCollect.location.xrealip_enable) {
                            location.addVariable('proxy_set_header X-Real-IP', '$remote_addr');
                        }

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

        const statusListen = await listenRepository.findOne({
            where: {
                listen_type: ListenTypes.http,
                listen_category: ListenCategory.status
            }
        });

        if (statusListen) {
            const sServer = new NginxConfServer();
            sServer.addListen(new Listen(
                statusListen.listen_port,
                NginxService.DEFAULT_IP_LOCAL,
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

        const defaultListen = await listenRepository.findOne({
            where: {
                listen_type: ListenTypes.http,
                listen_category: ListenCategory.default_http
            }
        });

        if (defaultListen) {
            const dServer = new NginxConfServer();
            dServer.addListen(new Listen(
                defaultListen.listen_port,
                '',
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

            const locWellKnown = new Location('/.well-known');

            locWellKnown.addVariable('auth_basic', 'off');
            locWellKnown.addVariable('auth_request', 'off');
            locWellKnown.addVariable('default_type', '"text/plain"');
            locWellKnown.addVariable('alias', '/opt/app/nginx/html/.well-known');

            dServer.addLocation(locWellKnown);

            const loc404 = new Location('/404.html');
            loc404.addVariable('root', '/opt/app/nginx/pages');
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
            Logger.getLogger().info('NginxService::_startSysLog::SysLogServer::setOnListen: Liste started on: ' +
                `${sysLogServer.getOptions().address}:${sysLogServer.getOptions().port}`);
        });

        this._syslog.setOnError((sysLogServer, err) => {
            Logger.getLogger().error('NginxService::_startSysLog::SysLogServer::setOnError: ');
            Logger.getLogger().error(err);
        });

        this._syslog.setOnMessage((sysLogServer, msg) => {
            Logger.getLogger().silly(`NginxService::_startSysLog::SysLogServer::setOnMessage: ${msg.toString()}`);

            const parts = msg.toString().split(`${NginxService.SYSLOG_TAG}: `);

            try {
                const nginxLog = JSON.parse(parts[1]);

                if (nginxLog.source_type) {
                    const errors: SchemaErrors = [];

                    if (nginxLog.source_type === 'stream') {
                        if (SchemaJsonLogAccessStream.validate(nginxLog, errors)) {
                            NginxStreamAccessInfluxDB.addLog(nginxLog);
                        } else {
                            Logger.getLogger().error(
                                'NginxService::_startSysLog::SysLogServer::setOnMessage:stream: Validation error SchemaJsonLogAccessStream:'
                            );

                            Logger.getLogger().error(JSON.stringify(errors, null, 2));
                        }
                    } else if (nginxLog.source_type === 'http') {
                        if (SchemaJsonLogAccessHttp.validate(nginxLog, errors)) {
                            NginxHttpAccessInfluxDB.addLog(nginxLog);
                        } else {
                            Logger.getLogger().error(
                                'NginxService::_startSysLog::SysLogServer::setOnMessage: Validation error SchemaJsonLogAccessHttp:'
                            );

                            Logger.getLogger().error(JSON.stringify(errors, null, 2));
                        }
                    }
                }
            } catch (error) {
                Logger.getLogger().error('NginxService::_startSysLog::SysLogServer::setOnMessage: Exception:');

                if (error instanceof Error) {
                    Logger.getLogger().error(error.message);
                } else {
                    console.log(error);
                }

                Logger.getLogger().error(JSON.stringify(error, null, 2));
            }
        });

        this._syslog.listen();
    }

    /**
     * start
     */
    public async start(): Promise<void> {
        const dhparam = Config.getInstance().get()?.nginx?.dhparamfile;

        if (dhparam) {
            if (fs.existsSync(dhparam)) {
                Logger.getLogger().info('NginxService::start: Dhparam found.');
            } else {
                Logger.getLogger().info('NginxService::start: Create Dhparam ...');

                fs.mkdirSync(Path.dirname(dhparam), {recursive: true});

                if (await OpenSSL.createDhparam(dhparam, 4096) === null) {
                    Logger.getLogger().warn('NginxService::start: Can not create Dhparam!');
                } else {
                    Logger.getLogger().info('NginxService::start: Dhparam finish.');
                }
            }
        }

        this._startSysLog();
        await this._loadConfig();
        NginxServer.getInstance().start();

        if (NginxServer.getInstance().isRun()) {
            Logger.getLogger().info('NginxService::start: Nginx server is start');
        }
    }

    /**
     * stop
     * @param forced
     */
    public async stop(forced: boolean = false): Promise<void> {
        Logger.getLogger().info(`NginxService::stop: nginx stop with forced: ${forced}`);

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
            Logger.getLogger().error('NginxService::reload: Nginx server config has a error!');
        }

        NginxServer.getInstance().reload();

        if (NginxServer.getInstance().isRun()) {
            Logger.getLogger().info('NginxService::reload: Nginx server is reload');
        }
    }

}