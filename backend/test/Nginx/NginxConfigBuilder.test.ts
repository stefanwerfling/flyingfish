/**
 * Unit tests for the parts of NginxConfigBuilder that are a cross-component contract
 * and worth pinning without the DB-driven integration harness. Currently: the native
 * L4 access directive (nginx-native epic, Phase C) — its name and argument order must
 * match what the ngx_stream_flyingfish_access C module parses.
 */
import {NginxConfigBuilder} from '../../src/inc/Nginx/NginxConfigBuilder.js';

describe('NginxConfigBuilder.streamAccessDirective', () => {
    test('emits `flyingfish_access <socket> <listen_id>` — socket first, id second', () => {
        const d = NginxConfigBuilder.streamAccessDirective(
            '/opt/flyingfish/nginx/socks/nginx_control.sock',
            5
        );

        expect(d.name).toBe('flyingfish_access');
        expect(d.value).toBe('/opt/flyingfish/nginx/socks/nginx_control.sock 5');
    });

    test('is the native module directive, not the old njs js_access', () => {
        const d = NginxConfigBuilder.streamAccessDirective('/x.sock', 0);

        // the C module registers `flyingfish_access`, so the generator must not
        // regress to the njs `js_access mainstream.accessAddressStream`
        expect(d.name).not.toBe('js_access');
        expect(d.value).not.toContain('mainstream');
        expect(d.value).toBe('/x.sock 0');
    });

    test('the rendered `name value;` line the C module sees is well-formed (exactly two args)', () => {
        const d = NginxConfigBuilder.streamAccessDirective('/run/ff.sock', 42);
        const line = `${d.name} ${d.value};`;

        expect(line).toBe('flyingfish_access /run/ff.sock 42;');
        // the directive body is exactly the two args the module's NGX_CONF_TAKE2 expects
        expect(d.value.split(' ')).toHaveLength(2);
    });
});

describe('NginxConfigBuilder.httpAuthDirective', () => {
    test('emits `flyingfish_auth <socket> <location_id>` — socket first, id second', () => {
        const d = NginxConfigBuilder.httpAuthDirective(
            '/opt/flyingfish/nginx/socks/nginx_control.sock',
            7
        );

        expect(d.name).toBe('flyingfish_auth');
        expect(d.value).toBe('/opt/flyingfish/nginx/socks/nginx_control.sock 7');
    });

    test('is the native module directive, not the old njs js_content', () => {
        const d = NginxConfigBuilder.httpAuthDirective('/x.sock', 0);

        expect(d.name).not.toBe('js_content');
        expect(d.value).not.toContain('mainhttp');
        expect(d.value.split(' ')).toHaveLength(2);
    });
});
