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

    test('appends `secret=<value>` when a shared secret is configured', () => {
        const d = NginxConfigBuilder.streamAccessDirective('/run/ff.sock', 42, 'topsecret');

        // socket + id + the optional secret param (the module parses `secret=` after the two args)
        expect(d.value).toBe('/run/ff.sock 42 secret=topsecret');
        expect(d.value.split(' ')).toHaveLength(3);
    });

    test('omits the secret param when the secret is empty or undefined (pre-secret directive)', () => {
        expect(NginxConfigBuilder.streamAccessDirective('/run/ff.sock', 42, '').value).toBe('/run/ff.sock 42');
        expect(NginxConfigBuilder.streamAccessDirective('/run/ff.sock', 42).value).toBe('/run/ff.sock 42');
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

    test('appends `secret=<value>` when configured, omits it when empty/undefined', () => {
        expect(NginxConfigBuilder.httpAuthDirective('/x.sock', 7, 'topsecret').value).toBe('/x.sock 7 secret=topsecret');
        expect(NginxConfigBuilder.httpAuthDirective('/x.sock', 7, '').value).toBe('/x.sock 7');
        expect(NginxConfigBuilder.httpAuthDirective('/x.sock', 7).value).toBe('/x.sock 7');
    });
});

describe('NginxConfigBuilder.httpJwtDirective', () => {
    test('HS256 emits `flyingfish_jwt alg=HS256 secret=<v>`', () => {
        const d = NginxConfigBuilder.httpJwtDirective({alg: 'HS256', secret: 'shh'});

        expect(d.name).toBe('flyingfish_jwt');
        expect(d.value).toBe('alg=HS256 secret=shh');
    });

    test('asymmetric uses key_file, never secret', () => {
        const d = NginxConfigBuilder.httpJwtDirective({
            alg: 'ES256',
            keyFile: '/opt/flyingfish/nginx/jwt_7.pem'
        });

        expect(d.value).toBe('alg=ES256 key_file=/opt/flyingfish/nginx/jwt_7.pem');
        expect(d.value).not.toContain('secret=');
    });

    test('key_file wins over secret when both are given (asymmetric config)', () => {
        const d = NginxConfigBuilder.httpJwtDirective({
            alg: 'RS256',
            secret: 'ignored',
            keyFile: '/k.pem'
        });

        expect(d.value).toBe('alg=RS256 key_file=/k.pem');
    });

    test('appends iss/aud/require/leeway only when set', () => {
        const d = NginxConfigBuilder.httpJwtDirective({
            alg: 'HS256',
            secret: 'shh',
            iss: 'https://ff',
            aud: 'myapi',
            require: 'scope:admin',
            leeway: 30
        });

        expect(d.value).toBe(
            'alg=HS256 secret=shh iss=https://ff aud=myapi require=scope:admin leeway=30s'
        );
    });

    test('omits empty claim params and non-positive leeway', () => {
        const d = NginxConfigBuilder.httpJwtDirective({
            alg: 'HS256',
            secret: 'shh',
            iss: '',
            aud: '',
            require: '',
            leeway: 0
        });

        expect(d.value).toBe('alg=HS256 secret=shh');
    });

    test('is the native directive, not an njs/auth_request placeholder', () => {
        const d = NginxConfigBuilder.httpJwtDirective({alg: 'HS256', secret: 'x'});

        expect(d.name).toBe('flyingfish_jwt');
        expect(d.value.startsWith('alg=')).toBe(true);
    });
});
