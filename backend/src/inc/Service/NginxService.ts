import fs from 'fs';
import * as Path from 'path';
import {Config} from '../Config/Config';
import {Domain as DomainDB} from '../Db/MariaDb/Entity/Domain';
import {NginxHttp as NginxHttpDB} from '../Db/MariaDb/Entity/NginxHttp';
import {
    ListenTypes,
    ListenProtocol as ListenProtocolDB,
    NginxListen as NginxListenDB,
    ListenCategory
} from '../Db/MariaDb/Entity/NginxListen';
import {NginxLocation as NginxLocationDB} from '../Db/MariaDb/Entity/NginxLocation';
import {NginxStream as NginxStreamDB} from '../Db/MariaDb/Entity/NginxStream';
import {NginxUpstream as NginxUpstreamDB} from '../Db/MariaDb/Entity/NginxUpstream';
import {SshPort as SshPortDB} from '../Db/MariaDb/Entity/SshPort';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import {If} from '../Nginx/Config/If';
import {Certbot} from '../Provider/Letsencrypt/Certbot';
import {Logger} from '../Logger/Logger';
import {Listen, ListenProtocol} from '../Nginx/Config/Listen';
import {Location} from '../Nginx/Config/Location';
import {Map as NginxMap} from '../Nginx/Config/Map';
import {Server as NginxConfServer} from '../Nginx/Config/Server';
import {Upstream, UpstreamLoadBalancingAlgorithm} from '../Nginx/Config/Upstream';
import {NginxServer} from '../Nginx/NginxServer';
import {OpenSSL} from '../OpenSSL/OpenSSL';

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
    sshport_in?: SshPortDB;
    sshport_out?: SshPortDB;
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

    public static readonly DEFAULT_DOMAIN_NAME = '_';

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
     * _loadConfig
     * @private
     */
    private async _loadConfig(): Promise<void> {
        const conf = NginxServer.getInstance().getConf();
        conf?.resetStream();
        conf?.resetHttp();

        conf?.getStream().addVariable('js_import', '/opt/app/nginx/dist/njs.js');
        conf?.getHttp().addVariable('js_import', '/opt/app/nginx/dist/njs.js');

        // vars --------------------------------------------------------------------------------------------------------

        const streamMap: Map<number, StreamCollect> = new Map();
        const httpMap: Map<number, HttpCollect> = new Map();

        // read db -----------------------------------------------------------------------------------------------------

        const listenRepository = MariaDbHelper.getRepository(NginxListenDB);
        const domainRepository = MariaDbHelper.getRepository(DomainDB);
        const streamRepository = MariaDbHelper.getRepository(NginxStreamDB);
        const upstreamRepository = MariaDbHelper.getRepository(NginxUpstreamDB);
        const httpRepository = MariaDbHelper.getRepository(NginxHttpDB);
        const locationRepository = MariaDbHelper.getRepository(NginxLocationDB);
        const sshportRepository = MariaDbHelper.getRepository(SshPortDB);

        const listens = await listenRepository.find();

        for (const alisten of listens) {
            // read streams by db --------------------------------------------------------------------------------------

            if (alisten.listen_type === ListenTypes.stream) {
                const tstreams = await streamRepository.find({
                    where: {
                        listen_id: alisten.id
                    }
                });

                for (const astream of tstreams) {
                    const adomain = await domainRepository.findOne({
                        where: {
                            id: astream.domain_id
                        }
                    });

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

                        if (astream.sshport_in_id > 0) {
                            const sshport = await sshportRepository.findOne({
                                where: {
                                    id: astream.sshport_in_id
                                }
                            });

                            if (sshport) {
                                streamCollection.sshport_in = sshport;
                            }
                        }

                        if (astream.sshport_out_id > 0) {
                            const sshport = await sshportRepository.findOne({
                                where: {
                                    id: astream.sshport_out_id
                                }
                            });

                            if (sshport) {
                                streamCollection.sshport_out = sshport;
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

                for (const http of https) {
                    const adomain = await domainRepository.findOne({
                        where: {
                            id: http.domain_id
                        }
                    });

                    if (adomain) {
                        if (!httpMap.has(alisten.listen_port)) {
                            httpMap.set(alisten.listen_port, {
                                listen: alisten,
                                domains: new Map<string, HttpSubCollect>()
                            });
                        }

                        const mapDomainHttp = httpMap.get(alisten.listen_port);
                        const httpCollection: HttpSubCollect = {
                            http,
                            locations: []
                        };

                        const locations = await locationRepository.find({
                            where: {
                                http_id: http.id
                            }
                        });

                        if (locations) {
                            const locationCollects: HttpLocationCollect[] = [];

                            for (const alocation of locations) {
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

                        mapDomainHttp!.domains.set(adomain.domainname, httpCollection);

                        httpMap.set(alisten.listen_port, mapDomainHttp!);
                    }
                }
            }
        }

        // fill config -------------------------------------------------------------------------------------------------

        const tupstreams: string[] = [];

        streamMap.forEach((streamCollect, listenPort) => {
            const varName = `$ffstream${listenPort}`;
            const aMap = new NginxMap('$ssl_preread_server_name', varName);
            let defaultMapDomain: string|null = null;
            let procMap: NginxMap|null = null;

            streamCollect.domains.forEach((collectStream, domainName) => {
                const tstream = collectStream.stream;
                let upstreamName = 'ffus_';

                if (tstream.alias_name !== '') {
                    upstreamName += `${tstream.alias_name}_`;
                }

                upstreamName += `${tstream.domain_id}`;

                if (tupstreams.indexOf(upstreamName) === -1) {
                    tupstreams.push(upstreamName);

                    const upStream = new Upstream(upstreamName);
                    upStream.setAlgorithm(tstream.load_balancing_algorithm as UpstreamLoadBalancingAlgorithm);

                    if (collectStream.destination_listen) {
                        // fill default listen destination
                        upStream.addServer({
                            address: '127.0.0.1',
                            port: collectStream.destination_listen.listen_port,
                            weight: 0,
                            max_fails: 0,
                            fail_timeout: 0
                        });
                    } else if (collectStream.sshport_in) {
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
                            address: Config.get()?.sshserver?.ip!,
                            port: 22,
                            weight: 0,
                            max_fails: 0,
                            fail_timeout: 0
                        });
                    } else if (collectStream.sshport_out) {
                        // fill default ssh server
                        upStream.addServer({
                            address: Config.get()?.sshserver?.ip!,
                            port: collectStream.sshport_out.port,
                            weight: 0,
                            max_fails: 0,
                            fail_timeout: 0
                        });
                    } else if (collectStream.upstreams.length > 0) {
                        for (const tupstream of collectStream.upstreams) {
                            upStream.addServer({
                                address: tupstream.destination_address,
                                port: tupstream.destination_port,
                                weight: tupstream.weight,
                                max_fails: tupstream.max_fails,
                                fail_timeout: tupstream.fail_timeout
                            });
                        }
                    } else {
                        // fill default
                        upStream.addServer({
                            address: '127.0.0.1',
                            port: 10080,
                            weight: 0,
                            max_fails: 0,
                            fail_timeout: 0
                        });
                    }

                    if (!conf?.getStream().hashUpstream(upStream.getStreamName())) {
                        conf?.getStream().addUpstream(upStream);
                    }
                }

                if (tstream.isdefault) {
                    defaultMapDomain = upstreamName;
                } else {
                    aMap.addVariable(`${domainName}`, upstreamName);
                }
            });

            if (defaultMapDomain !== null) {
                aMap.addVariable('default', defaultMapDomain);
            }

            conf?.getStream().addMap(aMap);

            const aServer = new NginxConfServer();

            if ((streamCollect.listen.listen_protocol === ListenProtocolDB.tcp) ||
                (streamCollect.listen.listen_protocol === ListenProtocolDB.tcp_udp)) {
                aServer.addListen(new Listen(listenPort));
            }

            if ((streamCollect.listen.listen_protocol === ListenProtocolDB.udp) ||
                (streamCollect.listen.listen_protocol === ListenProtocolDB.tcp_udp)) {
                aServer.addListen(new Listen(listenPort, '', false, false, ListenProtocol.udp));
            }

            if (streamCollect.listen.enable_ipv6) {
                if ((streamCollect.listen.listen_protocol === ListenProtocolDB.tcp) ||
                    (streamCollect.listen.listen_protocol === ListenProtocolDB.tcp_udp)) {
                    aServer.addListen(new Listen(listenPort, '[::]'));
                }

                if ((streamCollect.listen.listen_protocol === ListenProtocolDB.udp) ||
                    (streamCollect.listen.listen_protocol === ListenProtocolDB.tcp_udp)) {
                    aServer.addListen(new Listen(listenPort, '[::]', false, false, ListenProtocol.udp));
                }
            }

            aServer.addVariable('set $ff_address_access_url', NginxService.INTERN_SERVER_ADDRESS_ACCESS);
            aServer.addVariable('set $ff_listen_id', `${streamCollect.listen.id}`);
            aServer.addVariable('js_access', 'njs.accessAddressStream');
            aServer.addVariable('ssl_preread', 'on');

            if (procMap !== null && procMap as NginxMap) {
                const tprocMap: NginxMap = procMap;

                conf?.getStream().addMap(tprocMap);
                aServer.addVariable('proxy_pass', tprocMap.getDestinationVar());
            } else {
                aServer.addVariable('proxy_pass', varName);
            }

            conf?.getStream().addServer(aServer);
        });

        httpMap.forEach((domainHttps, listenPort) => {
            domainHttps.domains.forEach((httpSubCollect, domainName) => {
                const ssl_enable = httpSubCollect.http.ssl_enable;

                const aServer = new NginxConfServer();

                // ssl use ---------------------------------------------------------------------------------------------

                if (ssl_enable) {
                    const sslCert = Certbot.existCertificate(domainName);

                    if (sslCert) {
                        aServer.addVariable('ssl_protocols', 'TLSv1 TLSv1.1 TLSv1.2');
                        aServer.addVariable('ssl_prefer_server_ciphers', 'on');
                        aServer.addVariable('ssl_ciphers', '\'' +
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
                        aServer.addVariable('ssl_ecdh_curve', 'secp384r1');

                        const dhparam = Config.get()?.nginx?.dhparamfile;

                        if (dhparam) {
                            aServer.addVariable('ssl_dhparam', dhparam);
                        }

                        aServer.addVariable('server_tokens', 'off');
                        aServer.addVariable('ssl_session_timeout', '1d');
                        aServer.addVariable('ssl_session_cache', 'shared:SSL:50m');
                        aServer.addVariable('ssl_session_tickets', 'off');
                        aServer.addVariable('add_header Strict-Transport-Security', '"max-age=63072000; includeSubdomains; preload"');
                        aServer.addVariable('ssl_stapling', 'on');
                        aServer.addVariable('ssl_stapling_verify', 'on');
                        aServer.addVariable('ssl_trusted_certificate', `${sslCert}/chain.pem`);
                        aServer.addVariable('ssl_certificate', `${sslCert}/fullchain.pem`);
                        aServer.addVariable('ssl_certificate_key', `${sslCert}/privkey.pem`);
                        aServer.addVariable('resolver', '127.0.0.1 valid=300s');
                        aServer.addVariable('resolver_timeout', '5s');
                        aServer.addVariable('add_header X-Frame-Options', 'DENY');
                        aServer.addVariable('add_header X-XSS-Protection', '"1; mode=block"');
                        aServer.addVariable('add_header X-Content-Type-Options', 'nosniff');
                        aServer.addVariable('add_header X-Robots-Tag', 'none');

                        // check is host and server name right
                        const domainIf = new If('$host != $server_name');
                        domainIf.addVariable('return', '444');

                        aServer.addContext(domainIf);
                    } else {
                        Logger.getLogger().warn(`Certificat for Domain '${domainName}' not found and ignore settings.`);
                        return;
                    }
                }

                // listen ----------------------------------------------------------------------------------------------

                if (domainName !== NginxService.DEFAULT_DOMAIN_NAME) {
                    aServer.addListen(new Listen(
                        listenPort,
                        '',
                        ssl_enable,
                        httpSubCollect.http.http2_enable
                    ));

                    if (domainHttps.listen.enable_ipv6) {
                        aServer.addListen(new Listen(
                            listenPort,
                            '[::]',
                            ssl_enable,
                            httpSubCollect.http.http2_enable
                        ));
                    }

                    aServer.setServerName(domainName);

                    // locations -------------------------------------------------------------------------------------------

                    for (const locationCollect of httpSubCollect.locations) {
                        const entry = locationCollect.location;
                        let match = entry.match;

                        if (match === '') {
                            match = '/';
                        }

                        const location = new Location(match, entry.modifier);

                        if (entry.redirect !== '') {
                            let redirectCode = 301;

                            if (entry.redirect_code > 0) {
                                redirectCode = entry.redirect_code;
                            }

                            location.addVariable(`return ${redirectCode}`, entry.redirect);
                            aServer.addLocation(location);

                            continue;
                        }

                        // auth use ----------------------------------------------------------------------------------------

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
                            authLocation.addVariable('set $ff_auth_basic_url', NginxService.INTERN_SERVER_AUTH_BASIC);
                            authLocation.addVariable('set $ff_location_id', `${entry.id}`);
                            authLocation.addVariable('set $ff_authheader', '$http_authorization');
                            authLocation.addVariable('js_content', 'njs.authorize');
                            aServer.addLocation(authLocation);
                        }

                        // proxy header ------------------------------------------------------------------------------------

                        location.addVariable('proxy_set_header Host', '$host');
                        location.addVariable('proxy_set_header X-Forwarded-Scheme', '$scheme');
                        location.addVariable('proxy_set_header X-Forwarded-Proto', '$scheme');
                        location.addVariable('proxy_set_header X-Forwarded-For', '$remote_addr');
                        location.addVariable('proxy_set_header X-Real-IP', '$remote_addr');

                        if (locationCollect.sshport_out) {
                            location.addVariable(
                                'proxy_pass',
                                `${entry.sshport_schema}://${Config.get()?.sshserver?.ip}:${locationCollect.sshport_out.port}`
                            );
                        } else if (entry.proxy_pass) {
                            location.addVariable('proxy_pass', entry.proxy_pass);
                        }

                        // websocket use -----------------------------------------------------------------------------------

                        if (locationCollect.location.websocket_enable) {
                            location.addVariable('proxy_set_header Upgrade', '$http_upgrade');
                            location.addVariable('proxy_set_header Connection', '$http_connection');
                            location.addVariable('proxy_http_version', '1.1');
                        }

                        aServer.addLocation(location);
                    }

                    conf?.getHttp().addServer(aServer);
                }
            });
        });

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
                '127.0.0.1',
                false,
                false,
                ListenProtocol.none,
                true
            ));

            const locStatus = new Location(NginxService.LOCATION_STATUS);
            locStatus.addVariable('stub_status', 'on');
            locStatus.addVariable('access_log', 'off');
            locStatus.addVariable('allow', '127.0.0.1');
            locStatus.addVariable('deny', 'all');
            sServer.addLocation(locStatus);

            conf?.getHttp().addServer(sServer);
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
                ListenProtocol.none,
                true
            ));

            dServer.addErrorPage({
                code: '500 502 503 504',
                uri: '/50x.html'
            });

            dServer.addErrorPage({
                code: '404',
                uri: '/404.html'
            });

            const locWellKnown = new Location('/.well-known');
            locWellKnown.addVariable('alias', '/opt/app/nginx/html/.well-known');
            dServer.addLocation(locWellKnown);

            const loc404 = new Location('/404.html');
            loc404.addVariable('root', '/opt/app/nginx/pages');
            loc404.addVariable('internal', '');
            dServer.addLocation(loc404);

            conf?.getHttp().addServer(dServer);
        }
    }

    /**
     * start
     */
    public async start(): Promise<void> {
        const dhparam = Config.get()?.nginx?.dhparamfile;

        if (dhparam) {
            if (fs.existsSync(dhparam)) {
                Logger.getLogger().info('Dhparam found.');
            } else {
                Logger.getLogger().info('Create Dhparam ...');

                fs.mkdirSync(Path.dirname(dhparam), {recursive: true});

                if (await OpenSSL.createDhparam(dhparam, 4096) === null) {
                    Logger.getLogger().warn('Can not create Dhparam!');
                } else {
                    Logger.getLogger().info('Dhparam finish.');
                }
            }
        }

        await this._loadConfig();
        NginxServer.getInstance().start();

        if (NginxServer.getInstance().isRun()) {
            Logger.getLogger().info('Nginx server is start');
        }
    }

    /**
     * stop
     */
    public async stop(): Promise<void> {
        if (NginxServer.getInstance().isRun()) {
            NginxServer.getInstance().stop();
        }
    }

    /**
     * reload
     */
    public async reload(): Promise<void> {
        await this._loadConfig();
        NginxServer.getInstance().reload();

        if (NginxServer.getInstance().isRun()) {
            Logger.getLogger().info('Nginx server is reload');
        }
    }

}