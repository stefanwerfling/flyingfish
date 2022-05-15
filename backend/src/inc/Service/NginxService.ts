import {NginxDomain as NginxDomainDB} from '../Db/MariaDb/Entity/NginxDomain';
import {NginxHttp as NginxHttpDB} from '../Db/MariaDb/Entity/NginxHttp';
import {ListenTypes, NginxListen as NginxListenDB} from '../Db/MariaDb/Entity/NginxListen';
import {NginxLocation as NginxLocationDB} from '../Db/MariaDb/Entity/NginxLocation';
import {NginxStream as NginxStreamDB} from '../Db/MariaDb/Entity/NginxStream';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import {Certbot} from '../Letsencrypt/Certbot';
import {Map as NginxMap} from '../Nginx/Config/Map';
import {Server as NginxConfServer} from '../Nginx/Config/Server';
import {Upstream} from '../Nginx/Config/Upstream';
import {NginxServer} from '../Nginx/NginxServer';
import {Location} from '../Nginx/Config/Location';
import {Listen} from '../Nginx/Config/Listen';
import {OpenSSL} from '../OpenSSL/OpenSSL';

/**
 * HttpSubCollect
 */
type HttpSubCollect = {
    http: NginxHttpDB;
    locations: NginxLocationDB[];
};

/**
 * HttpCollect
 */
type HttpCollect = {
    listen: NginxListenDB;
    domains: Map<string, HttpSubCollect>;
};

/**
 * StreamCollect
 */
type StreamCollect = {
    listen: NginxListenDB;
    domains: Map<string, NginxStreamDB>;
};

/**
 * NginxService
 */
export class NginxService {

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

        // vars --------------------------------------------------------------------------------------------------------

        const streamMap: Map<number, StreamCollect> = new Map();
        const httpMap: Map<number, HttpCollect> = new Map();

        // read db -----------------------------------------------------------------------------------------------------

        const listenRepository = MariaDbHelper.getRepository(NginxListenDB);
        const domainRepository = MariaDbHelper.getRepository(NginxDomainDB);
        const streamRepository = MariaDbHelper.getRepository(NginxStreamDB);
        const httpRepository = MariaDbHelper.getRepository(NginxHttpDB);
        const locationRepository = MariaDbHelper.getRepository(NginxLocationDB);

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
                                domains: new Map<string, NginxStreamDB>()
                            });
                        }

                        const mapDomainStreams = streamMap.get(alisten.listen_port);
                        mapDomainStreams!.domains.set(adomain.domainname, astream);

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
                            httpCollection.locations = locations;
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

            streamCollect.domains.forEach((tstream, domainName) => {
                let upstreamName = 'ffus_';

                if (tstream.alias_name !== '') {
                    upstreamName += `${tstream.alias_name}_`;
                }

                upstreamName += `${tstream.domain_id}`;

                if (tupstreams.indexOf(upstreamName) === -1) {
                    tupstreams.push(upstreamName);

                    const upStream = new Upstream(upstreamName);
                    upStream.addVariable('server', `${tstream.destination_address}:${tstream.destination_port}`);

                    conf?.getStream().addUpstream(upStream);
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
            aServer.addListen(new Listen(listenPort));

            if (streamCollect.listen.enable_ipv6) {
                aServer.addListen(new Listen(listenPort, '[::]'));
            }

            aServer.addVariable('set $ff_address_access_url', 'http://127.0.0.1:3000/njs/address_access');
            aServer.addVariable('js_access', 'njs.accessAddressStream');
            aServer.addVariable('proxy_pass', varName);
            aServer.addVariable('ssl_preread', 'on');

            conf?.getStream().addServer(aServer);
        });

        httpMap.forEach((domainHttps, listenPort) => {
            let useAsDefault = false;

            domainHttps.domains.forEach((httpSubCollect, domainName) => {
                const ssl_enable = httpSubCollect.http.ssl_enable;

                const aServer = new NginxConfServer();

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
                        aServer.addVariable('ssl_dhparam', OpenSSL.getDhparamFile());
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
                        aServer.addVariable('resolver', '8.8.8.8 8.8.4.4 valid=300s');
                        aServer.addVariable('resolver_timeout', '5s');
                        aServer.addVariable('add_header X-Frame-Options', 'DENY');
                        aServer.addVariable('add_header X-XSS-Protection', '"1; mode=block"');
                        aServer.addVariable('add_header X-Content-Type-Options', 'nosniff');
                        aServer.addVariable('add_header X-Robots-Tag', 'none');
                    } else {
                        return;
                    }
                } else {
                    useAsDefault = true;
                }

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

                for (const entry of httpSubCollect.locations) {
                    const location = new Location(entry.match, entry.modifier);

                    if (entry.redirect !== '') {
                        let redirectCode = 301;

                        if (entry.redirect_code > 0) {
                            redirectCode = entry.redirect_code;
                        }

                        location.addVariable(`return ${redirectCode}`, entry.redirect);
                    }

                    if (entry.proxy_pass) {
                        location.addVariable('proxy_pass', entry.proxy_pass);
                        location.addVariable('proxy_set_header', 'Host $host');
                    }

                    aServer.addLocation(location);
                }

                conf?.getHttp().addServer(aServer);
            });

            // add default server --------------------------------------------------------------------------------------

            if (useAsDefault) {
                const dServer = new NginxConfServer();
                dServer.addListen(new Listen(listenPort, '', false, false, true));
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
        });

    }

    /**
     * start
     */
    public async start(): Promise<void> {
        if (OpenSSL.existDhparam()) {
            console.log('Dhparam found.');
        } else {
            console.log('Create Dhparam ...');

            if (await OpenSSL.createDhparam(4096) === null) {
                console.log('Can not create Dhparam!');
            } else {
                console.log('Dhparam finish.');
            }
        }

        await this._loadConfig();
        NginxServer.getInstance().start();

        if (NginxServer.getInstance().isRun()) {
            console.log('Nginx server is start');
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
            console.log('Nginx server is reload');
        }
    }

}