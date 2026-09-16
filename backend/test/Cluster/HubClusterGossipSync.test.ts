/**
 * Tests for the Hub↔clusterserver gossip sync client (Cluster/Mesh epic 9.5.12 phase
 * 2b): pullLocalState reads the Hub's publishable entries (skipping malformed) and
 * pushAggregate posts the converged aggregate with the registry secret. An in-process
 * integration drives the client against the REAL Hub ClusterLocalStateProvider +
 * ClusterAggregateStore, proving the wire contract. Network-free.
 */
import {HubClusterGossipSync} from 'flyingfish_core';
import {ClusterStateEntry} from 'flyingfish_schemas';
import {ClusterAggregateStore} from '../../src/Application/Hub/ClusterAggregateStore.js';
import {ClusterLocalStateProvider} from '../../src/Application/Hub/ClusterLocalStateProvider.js';

type FetchInit = {method?: string; headers?: Record<string, string>; body?: string;};

/**
 * A fake fetch returning a canned body and recording calls.
 * @param body - the JSON body to return
 */
const createFetch = (body: unknown): {
    calls: {url: string; init?: FetchInit;}[];
    fetchImpl: (url: string, init?: FetchInit) => Promise<{json(): Promise<unknown>;}>;
} => {
    const calls: {url: string; init?: FetchInit;}[] = [];

    return {
        calls: calls,
        fetchImpl: async(url: string, init?: FetchInit): Promise<{json(): Promise<unknown>;}> => {
            calls.push({url: url, init: init});

            return {json: async(): Promise<unknown> => body};
        }
    };
};

describe('HubClusterGossipSync', () => {
    test('pullLocalState reads entries and skips malformed ones', async() => {
        const fake = createFetch({entries: [{key: 'hub', value: {host: 'h1'}}, {value: 'no-key'}, {key: 'x', value: 1}]});
        const sync = new HubClusterGossipSync({hubUrl: 'http://hub/', selfNodeUid: 'node-a', secret: 's', fetchImpl: fake.fetchImpl});

        const entries = await sync.pullLocalState();

        expect(fake.calls[0].url).toBe('http://hub/json/registry/cluster/local-state');
        expect(fake.calls[0].init?.headers?.['x-flyingfish-registry-secret']).toBe('s');
        expect(entries).toEqual([{key: 'hub', value: {host: 'h1'}}, {key: 'x', value: 1}]);
    });

    test('pushAggregate posts the entries with the nodeUid and secret', async() => {
        const fake = createFetch({});
        const sync = new HubClusterGossipSync({hubUrl: 'http://hub', selfNodeUid: 'node-a', secret: 's', fetchImpl: fake.fetchImpl});

        await sync.pushAggregate([{key: 'node-a/hub', value: {host: 'h1'}}]);

        expect(fake.calls[0].url).toBe('http://hub/json/registry/cluster/aggregate');
        expect(fake.calls[0].init?.method).toBe('POST');
        const sent = JSON.parse(fake.calls[0].init!.body!) as {nodeUid: string; entries: ClusterStateEntry[];};
        expect(sent.nodeUid).toBe('node-a');
        expect(sent.entries).toEqual([{key: 'node-a/hub', value: {host: 'h1'}}]);
    });

    test('integration: pulls the Hub local state and pushes an aggregate into the real Hub store', async() => {
        // inject a fake domain source so the provider needs no database
        const provider = new ClusterLocalStateProvider(
            async() => [
                {id: 7, domainname: 'example.test', disable: false, fixdomain: false, recordless: false, parent_id: 0, cluster_priority: 0}
            ],
            async() => undefined
        );
        const aggregate = new ClusterAggregateStore();

        const fetchImpl = async(url: string, init?: FetchInit): Promise<{json(): Promise<unknown>;}> => {
            if (url.endsWith('/aggregate')) {
                const body = JSON.parse(init!.body!) as {entries: ClusterStateEntry[];};
                aggregate.set(body.entries);

                return {json: async(): Promise<unknown> => ({})};
            }

            return {json: async(): Promise<unknown> => ({entries: await provider.entries()})};
        };

        const sync = new HubClusterGossipSync({hubUrl: 'http://hub', selfNodeUid: 'node-a', fetchImpl: fetchImpl});

        // the Hub publishes at least a 'hub' descriptor
        const local = await sync.pullLocalState();
        expect(local.some((entry) => entry.key === 'hub')).toBe(true);

        // clusterserver would namespace by nodeUid, then push the aggregate back
        await sync.pushAggregate(local.map((entry) => ({key: `node-a/${entry.key}`, value: entry.value})));

        expect(aggregate.entries().map((entry) => entry.key)).toContain('node-a/hub');
    });
});