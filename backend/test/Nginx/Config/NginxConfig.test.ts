/**
 * Safety net for the nginx config generation (refactoring phase 1).
 *
 * These tests pin the rendered output format of the config object model
 * (backend/src/inc/Nginx/Config/*) BEFORE NginxService is split in phase 2 into
 * ConfigBuilder/Process/AccessLog/Control. They need neither a DB nor a running
 * nginx process - only the pure generate() methods.
 */
import {Http} from '../../../src/inc/Nginx/Config/Http.js';
import {If} from '../../../src/inc/Nginx/Config/If.js';
import {Listen, ListenProtocol} from '../../../src/inc/Nginx/Config/Listen.js';
import {Location} from '../../../src/inc/Nginx/Config/Location.js';
import {Map as NginxMap} from '../../../src/inc/Nginx/Config/Map.js';
import {Server} from '../../../src/inc/Nginx/Config/Server.js';
import {Stream} from '../../../src/inc/Nginx/Config/Stream.js';
import {Upstream, UpstreamLoadBalancingAlgorithm} from '../../../src/inc/Nginx/Config/Upstream.js';

describe('Nginx Config :: Listen', () => {
    test('simple port listen without IP', () => {
        const listen = new Listen({network: {ip: '', port: 80}});
        expect(listen.generate()).toBe('listen 80;');
    });

    test('SSL + HTTP/2 + proxy_protocol + default_server with IP', () => {
        const listen = new Listen({network: {ip: '0.0.0.0', port: 443}}, true, true, true, ListenProtocol.none, true);
        expect(listen.generate()).toBe('listen 0.0.0.0:443 ssl http2 proxy_protocol default_server;');
    });

    test('UDP stream listen (DNS :53)', () => {
        const listen = new Listen({network: {ip: '', port: 53}}, false, false, false, ListenProtocol.udp);
        expect(listen.generate()).toBe('listen 53 udp;');
    });

    test('unix socket listen', () => {
        const listen = new Listen({unix: '/opt/flyingfish/nginx/socks/http.sock'});
        expect(listen.generate()).toBe('listen unix:/opt/flyingfish/nginx/socks/http.sock;');
    });
});

describe('Nginx Config :: Upstream', () => {
    test('single server without options', () => {
        const ups = new Upstream('stream_to_8080');
        ups.addServer({address: '127.0.0.1', port: 8080, weight: 0, max_fails: 0, fail_timeout: 0});

        const out = ups.generate();
        expect(out).toContain('upstream stream_to_8080 {');
        expect(out).toContain('\tserver 127.0.0.1:8080;');
        expect(out).toMatchSnapshot();
    });

    test('server with weight/max_fails/fail_timeout', () => {
        const ups = new Upstream('weighted');
        ups.addServer({address: '10.0.0.1', port: 9000, weight: 5, max_fails: 3, fail_timeout: 30});
        expect(ups.generate()).toContain('\tserver 10.0.0.1:9000 weight=5 max_fails=3 fail_timeout=30s;');
    });

    test('multiple servers enable the least_conn algorithm', () => {
        const ups = new Upstream('balanced');
        ups.setAlgorithm(UpstreamLoadBalancingAlgorithm.least_conn);
        ups.addServer({address: '10.0.0.1', port: 9000, weight: 0, max_fails: 0, fail_timeout: 0});
        ups.addServer({address: '10.0.0.2', port: 9000, weight: 0, max_fails: 0, fail_timeout: 0});

        const out = ups.generate();
        expect(out).toContain('\tleast_conn;');
        expect(out).toContain('\tserver 10.0.0.1:9000;');
        expect(out).toContain('\tserver 10.0.0.2:9000;');
        expect(out).toMatchSnapshot();
    });

    test('ip_hash is NOT set with a single server', () => {
        const ups = new Upstream('single');
        ups.setAlgorithm(UpstreamLoadBalancingAlgorithm.ip_hash);
        ups.addServer({address: '10.0.0.1', port: 9000, weight: 0, max_fails: 0, fail_timeout: 0});
        expect(ups.generate()).not.toContain('ip_hash;');
    });
});

describe('Nginx Config :: Location', () => {
    test('location with modifier and variable', () => {
        const loc = new Location('/health', '=');
        loc.addVariable('return', '200');
        expect(loc.generate()).toBe('location = /health {\n\treturn 200;\n}\n');
    });
});

describe('Nginx Config :: Server (HTTP)', () => {
    test('reverse-proxy server with SSL listen and proxy_pass location', () => {
        const server = new Server('example.com');
        server.addListen(new Listen({network: {ip: '', port: 443}}, true, true));
        server.addVariable('ssl_certificate', '/etc/letsencrypt/live/example.com/fullchain.pem');
        server.addVariable('ssl_certificate_key', '/etc/letsencrypt/live/example.com/privkey.pem');

        const loc = new Location('/');
        loc.addVariable('proxy_pass', 'http://stream_to_8080');
        server.addLocation(loc);

        const out = server.generate();
        expect(out).toContain('server_name example.com;');
        expect(out).toContain('listen 443 ssl http2;');
        expect(out).toContain('proxy_pass http://stream_to_8080;');
        expect(out).toMatchSnapshot();
    });
});

describe('Nginx Config :: Stream (core routing)', () => {
    test('stream with upstream + proxy_protocol server', () => {
        const upstream = new Upstream('stream_to_8080');
        upstream.addServer({address: '127.0.0.1', port: 8080, weight: 0, max_fails: 0, fail_timeout: 0});

        const server = new Server();
        server.addListen(new Listen({network: {ip: '', port: 443}}, false, false, true));
        server.addVariable('proxy_pass', 'stream_to_8080');
        server.addVariable('proxy_protocol', 'on');

        const stream = new Stream();
        stream.addUpstream(upstream);
        stream.addServer(server);

        const out = stream.generate();
        expect(out).toContain('stream {');
        expect(out).toContain('upstream stream_to_8080 {');
        expect(out).toContain('listen 443 proxy_protocol;');
        expect(out).toContain('proxy_protocol on;');
        expect(stream.hashUpstream('stream_to_8080')).toBe(true);
        expect(out).toMatchSnapshot();
    });

    test('SNI routing: map + two upstreams + ssl_preread server', () => {
        const upA = new Upstream('backend_a');
        upA.addServer({address: '10.0.0.10', port: 443, weight: 0, max_fails: 0, fail_timeout: 0});

        const upB = new Upstream('backend_b');
        upB.addServer({address: '10.0.0.11', port: 443, weight: 0, max_fails: 0, fail_timeout: 0});

        const sniMap = new NginxMap('$ssl_preread_server_name', '$ff_backend');
        sniMap.addVariable('default', 'backend_a');
        sniMap.addVariable('a.example.com', 'backend_a');
        sniMap.addVariable('b.example.com', 'backend_b');

        const server = new Server();
        server.addListen(new Listen({network: {ip: '', port: 443}}, false, false, true));
        server.addVariable('ssl_preread', 'on');
        server.addVariable('proxy_pass', '$ff_backend');

        const stream = new Stream();
        stream.addUpstream(upA);
        stream.addUpstream(upB);
        stream.addMap(sniMap);
        stream.addServer(server);

        const out = stream.generate();
        expect(out).toContain('upstream backend_a {');
        expect(out).toContain('upstream backend_b {');
        expect(out).toContain('map $ssl_preread_server_name $ff_backend {');
        expect(out).toContain('ssl_preread on;');
        expect(out).toContain('proxy_pass $ff_backend;');
        expect(out).toContain('listen 443 proxy_protocol;');
        expect(out).toMatchSnapshot();
    });
});

describe('Nginx Config :: Listen (IPv6 / dual-stack)', () => {
    test('IPv6 listen ([::]) with SSL + HTTP/2', () => {
        const listen = new Listen({network: {ip: '[::]', port: 443}}, true, true);
        expect(listen.generate()).toBe('listen [::]:443 ssl http2;');
    });
});

describe('Nginx Config :: Upstream (unix socket)', () => {
    test('server via unix socket (address/port are ignored)', () => {
        const ups = new Upstream('sock_ups');
        ups.addServer({
            address: '',
            port: 0,
            weight: 0,
            max_fails: 0,
            fail_timeout: 0,
            unix_sock: '/opt/flyingfish/nginx/socks/http.sock'
        });
        expect(ups.generate()).toContain('\tserver unix:/opt/flyingfish/nginx/socks/http.sock;');
    });
});

describe('Nginx Config :: Map (SNI routing)', () => {
    test('map $ssl_preread_server_name -> backend', () => {
        const map = new NginxMap('$ssl_preread_server_name', '$backend');
        map.addVariable('default', 'backend_default');
        map.addVariable('example.com', 'backend_example');

        expect(map.generate()).toBe(
            'map $ssl_preread_server_name $backend {\n' +
            '\tdefault backend_default;\n' +
            '\texample.com backend_example;\n' +
            '}\n'
        );
    });

    test('getters for source and destination variable', () => {
        const map = new NginxMap('$host', '$upstream');
        expect(map.getSourceVar()).toBe('$host');
        expect(map.getDestinationVar()).toBe('$upstream');
    });
});

describe('Nginx Config :: If', () => {
    test('HTTP->HTTPS redirect', () => {
        const cond = new If('$scheme = http');
        cond.addVariable('return', '301 https://$host$request_uri');

        expect(cond.generate()).toBe(
            'if ($scheme = http) {\n' +
            '\treturn 301 https://$host$request_uri;\n' +
            '}\n'
        );
    });
});

describe('Nginx Config :: Http', () => {
    test('http block with directive and nested server', () => {
        const http = new Http();
        http.addVariable('sendfile', 'on');

        const server = new Server('example.com');
        server.addListen(new Listen({network: {ip: '', port: 80}}));
        http.addServer(server);

        const out = http.generate();
        expect(out).toContain('http {');
        expect(out).toContain('\tsendfile on;');
        expect(out).toContain('server_name example.com;');
        expect(out).toMatchSnapshot();
    });
});

describe('Nginx Config :: Server (dual-stack & error_page)', () => {
    test('IPv4+IPv6 listens, root, access_log and error_page', () => {
        const server = new Server('example.com');
        server.addListen(new Listen({network: {ip: '0.0.0.0', port: 443}}, true, true));
        server.addListen(new Listen({network: {ip: '[::]', port: 443}}, true, true));
        server.setRootDir('/var/www/html');
        server.setAccessLog('/var/log/nginx/example.access.log');
        server.addErrorPage({code: '404', uri: '/404.html'});

        const out = server.generate();
        expect(out).toContain('listen 0.0.0.0:443 ssl http2;');
        expect(out).toContain('listen [::]:443 ssl http2;');
        expect(out).toContain('root /var/www/html;');
        expect(out).toContain('access_log /var/log/nginx/example.access.log;');
        expect(out).toContain('error_page 404 /404.html;');
        expect(out).toMatchSnapshot();
    });
});