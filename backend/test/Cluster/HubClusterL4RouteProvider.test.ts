/**
 * Unit tests for the Hub-backed cluster L4 route provider (Cluster/Mesh epic 9.5.4):
 * publish POSTs the node's routes in wire form (proto as a string) with the registry
 * secret; list GETs the set and maps proto back to the enum and skips malformed
 * entries. Driven by a fake fetch — network-free.
 */
import {ClusterL4Proto, ClusterL4Route, HubClusterL4RouteProvider} from 'flyingfish_core';

type FetchCall = {url: string; init?: {method?: string; headers?: Record<string, string>; body?: string;};};

/**
 * A fake fetch that records calls and returns a canned JSON body.
 */
const createFetch = (body: unknown): {calls: FetchCall[]; fetchImpl: (url: string, init?: FetchCall['init']) => Promise<{json(): Promise<unknown>;}>;} => {
    const calls: FetchCall[] = [];

    return {
        calls: calls,
        fetchImpl: async(url: string, init?: FetchCall['init']): Promise<{json(): Promise<unknown>;}> => {
            calls.push({url: url, init: init});

            return {json: async(): Promise<unknown> => body};
        }
    };
};

const coreRoute: ClusterL4Route = {
    id: 'r1',
    proto: ClusterL4Proto.Udp,
    ingressNodeUid: 'node-a',
    listenPort: 53,
    egressNodeUid: 'node-b',
    targetHost: '10.0.0.9',
    targetPort: 53,
    proxyProtocol: false
};

describe('HubClusterL4RouteProvider', () => {
    test('publish POSTs the routes in wire form with the registry secret', async() => {
        const fake = createFetch({});
        const provider = new HubClusterL4RouteProvider({
            hubUrl: 'http://hub:5333/',
            selfNodeUid: 'node-a',
            secret: 's3cret',
            fetchImpl: fake.fetchImpl
        });

        await provider.publish([coreRoute]);

        expect(fake.calls[0].url).toBe('http://hub:5333/json/registry/cluster/routes/publish');
        expect(fake.calls[0].init?.method).toBe('POST');
        expect(fake.calls[0].init?.headers?.['x-flyingfish-registry-secret']).toBe('s3cret');

        const sent = JSON.parse(fake.calls[0].init!.body!) as {nodeUid: string; routes: {proto: string; id: string;}[];};
        expect(sent.nodeUid).toBe('node-a');
        expect(sent.routes[0].id).toBe('r1');
        // proto enum → wire string
        expect(sent.routes[0].proto).toBe('udp');
    });

    test('list GETs the set, maps proto back to the enum, and skips malformed entries', async() => {
        const fake = createFetch({
            list: [
                {id: 'r1', proto: 'tcp', ingressNodeUid: 'node-a', listenPort: 6001, egressNodeUid: 'node-b', targetHost: '10.0.0.5', targetPort: 5432},
                {id: 'r2', proto: 'udp', ingressNodeUid: '*', listenPort: 53, egressNodeUid: 'node-c', targetHost: '10.0.0.9', targetPort: 53},
                {id: 'bad', proto: 'tcp', ingressNodeUid: 'node-a', egressNodeUid: 'node-b', targetHost: '10.0.0.5'}
            ]
        });
        const provider = new HubClusterL4RouteProvider({
            hubUrl: 'http://hub:5333',
            selfNodeUid: 'node-a',
            fetchImpl: fake.fetchImpl
        });

        const routes = await provider.list();

        expect(fake.calls[0].url).toBe('http://hub:5333/json/registry/cluster/routes');
        // the malformed 'bad' entry (no listenPort/targetPort) is dropped
        expect(routes.map((route) => route.id)).toEqual(['r1', 'r2']);
        expect(routes[0].proto).toBe(ClusterL4Proto.Tcp);
        expect(routes[1].proto).toBe(ClusterL4Proto.Udp);
        expect(routes[1].ingressNodeUid).toBe('*');
    });

    test('list tolerates an empty/absent list', async() => {
        const fake = createFetch({});
        const provider = new HubClusterL4RouteProvider({hubUrl: 'http://hub', selfNodeUid: 'node-a', fetchImpl: fake.fetchImpl});

        expect(await provider.list()).toEqual([]);
    });
});