/**
 * Unit tests for the Hub cluster-domains client (Cluster/Mesh epic 9.5.14): the
 * dnsserver pulls this to learn each cluster-managed domain's active IP so it can
 * answer the A record with the active node's IP on failover. Covers the GET URL +
 * registry secret, parsing name/activeIp, null activeIp, and skipping malformed
 * entries. Driven by a fake fetch — network-free.
 */
import {HubClusterDomainsClient} from 'flyingfish_core';

type FetchInit = {headers?: Record<string, string>;};

const createFetch = (body: unknown): {calls: {url: string; init?: FetchInit;}[]; fetchImpl: (url: string, init?: FetchInit) => Promise<{json(): Promise<unknown>;}>;} => {
    const calls: {url: string; init?: FetchInit;}[] = [];

    return {
        calls: calls,
        fetchImpl: async(url: string, init?: FetchInit): Promise<{json(): Promise<unknown>;}> => {
            calls.push({url: url, init: init});

            return {json: async(): Promise<unknown> => body};
        }
    };
};

describe('HubClusterDomainsClient', () => {
    test('GETs the domains endpoint with the registry secret and parses name/activeIp', async() => {
        const fake = createFetch({list: [
            {name: 'ha.test', activeIp: '203.0.113.2', nodes: []},
            {name: 'down.test', activeIp: null, nodes: []}
        ]});
        const client = new HubClusterDomainsClient({hubUrl: 'http://hub/', secret: 's3cret', fetchImpl: fake.fetchImpl});

        const domains = await client.list();

        expect(fake.calls[0].url).toBe('http://hub/json/registry/cluster/domains');
        expect(fake.calls[0].init?.headers?.['x-flyingfish-registry-secret']).toBe('s3cret');
        expect(domains).toEqual([
            {name: 'ha.test', activeIp: '203.0.113.2'},
            {name: 'down.test', activeIp: null}
        ]);
    });

    test('coerces a non-string activeIp to null and skips entries without a name', async() => {
        const fake = createFetch({list: [
            {name: 'x.test', activeIp: 123},
            {activeIp: '10.0.0.1'},
            {name: 'y.test', activeIp: '10.0.0.2'}
        ]});
        const client = new HubClusterDomainsClient({hubUrl: 'http://hub', fetchImpl: fake.fetchImpl});

        expect(await client.list()).toEqual([
            {name: 'x.test', activeIp: null},
            {name: 'y.test', activeIp: '10.0.0.2'}
        ]);
    });

    test('tolerates an empty/absent list', async() => {
        const fake = createFetch({});
        const client = new HubClusterDomainsClient({hubUrl: 'http://hub', fetchImpl: fake.fetchImpl});

        expect(await client.list()).toEqual([]);
    });
});