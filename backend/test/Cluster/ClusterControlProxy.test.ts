/**
 * Tests for the Hub -> clusterserver control-request proxy (Cluster/Mesh epic
 * 9.5.12.4/.6): always resolves (never throws), mapping a missing clusterserver URL, a
 * non-OK HTTP status, and a thrown fetch error all into `{ok: false, error}`, and
 * passing a successful reply straight through. `global.fetch` is stubbed; no network.
 */
import {jest} from '@jest/globals';
import {FlyingFishConfig} from '../../src/Application/Config/FlyingFishConfig.js';
import {proxyClusterControlRequest} from '../../src/Application/Hub/ClusterControlProxy.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only partial config, the full BackendConfigOptions shape is irrelevant here
const setClusterserverUrl = (url: string | undefined): void => {
    const config: any = FlyingFishConfig.getInstance().get() ?? {};

    config.clusterserver = url === undefined ? undefined : {url};
    FlyingFishConfig.getInstance().set(config);
};

describe('proxyClusterControlRequest', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        global.fetch = originalFetch;
    });

    test('no clusterserver URL configured -> ok:false, no fetch attempted', async() => {
        setClusterserverUrl(undefined);
        const fetchSpy = jest.fn();
        global.fetch = fetchSpy as unknown as typeof fetch;

        const reply = await proxyClusterControlRequest('node-b', 'domain.list', {});

        expect(reply).toEqual({ok: false, error: expect.stringContaining('not configured')});
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('posts to <clusterserverUrl>/cluster/control with the request and relays a successful reply', async() => {
        setClusterserverUrl('http://127.0.0.1:5335/');
        const fetchSpy = jest.fn().mockResolvedValue({
            ok: true,
            json: async() => ({ok: true, payload: {list: [{id: 1, name: 'example.test'}]}})
        });
        global.fetch = fetchSpy as unknown as typeof fetch;

        const reply = await proxyClusterControlRequest('node-b', 'domain.list', {foo: 'bar'});

        expect(reply).toEqual({ok: true, payload: {list: [{id: 1, name: 'example.test'}]}});
        const [url, init] = fetchSpy.mock.calls[0];
        // trailing slash on the configured URL is stripped, not doubled
        expect(url).toBe('http://127.0.0.1:5335/cluster/control');
        expect(init.method).toBe('POST');
        expect(JSON.parse(init.body as string)).toEqual({nodeUid: 'node-b', method: 'domain.list', payload: {foo: 'bar'}});
    });

    test('a non-OK HTTP response -> ok:false with the status in the message', async() => {
        setClusterserverUrl('http://127.0.0.1:5335');
        global.fetch = jest.fn().mockResolvedValue({ok: false, status: 503}) as unknown as typeof fetch;

        const reply = await proxyClusterControlRequest('node-b', 'domain.list', {});

        expect(reply).toEqual({ok: false, error: expect.stringContaining('503')});
    });

    test('a thrown fetch error (e.g. connection refused) -> ok:false, never throws', async() => {
        setClusterserverUrl('http://127.0.0.1:5335');
        global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

        const reply = await proxyClusterControlRequest('node-b', 'domain.list', {});

        expect(reply.ok).toBe(false);
        expect(reply.error).toContain('ECONNREFUSED');
    });
});
