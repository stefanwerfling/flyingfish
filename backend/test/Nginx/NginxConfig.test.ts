/**
 * Unit test for NginxConfig.generate() - the top-level assembly of the nginx
 * config (modules, global variables, the stream block and the http block).
 *
 * Complements the config-object-model snapshots and is a first step of the
 * phase-2 NginxService split: create() now writes generate()'s output, so the
 * rendered config string is testable without file I/O.
 */
import {Listen} from '../../src/inc/Nginx/Config/Listen.js';
import {Server} from '../../src/inc/Nginx/Config/Server.js';
import {Upstream} from '../../src/inc/Nginx/Config/Upstream.js';
import {NginxConfig} from '../../src/inc/Nginx/NginxConfig.js';

describe('NginxConfig :: generate', () => {
    test('assembles modules, variables, stream and http (no file I/O)', () => {
        const config = new NginxConfig('/tmp/does-not-matter.conf');
        config.setPid('/run/nginx.pid');
        config.setErrorLog('/var/log/nginx/error.log');
        config.addModule('/usr/lib/nginx/modules/ngx_stream_js_module.so');

        const upstream = new Upstream('stream_to_8080');
        upstream.addServer({address: '127.0.0.1', port: 8080, weight: 0, max_fails: 0, fail_timeout: 0});
        config.getStream().addUpstream(upstream);

        const httpServer = new Server('example.com');
        httpServer.addListen(new Listen({network: {ip: '', port: 80}}));
        config.getHttp().addServer(httpServer);

        const out = config.generate();

        expect(out).toContain('load_module /usr/lib/nginx/modules/ngx_stream_js_module.so;');
        expect(out).toContain('user root;');
        expect(out).toContain('worker_processes auto;');
        expect(out).toContain('pid /run/nginx.pid;');
        expect(out).toContain('error_log /var/log/nginx/error.log;');
        expect(out).toContain('events {');
        expect(out).toContain('worker_connections 4096;');
        expect(out).toContain('stream {');
        expect(out).toContain('upstream stream_to_8080 {');
        expect(out).toContain('http {');
        expect(out).toContain('server_name example.com;');
        expect(out).toMatchSnapshot();
    });
});