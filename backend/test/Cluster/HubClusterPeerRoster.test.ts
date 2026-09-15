/**
 * Unit tests for the Hub-backed cluster peer roster (Cluster/Mesh epic 9.5.1).
 * A stub fetch stands in for the Hub so the roster is exercised without a running
 * instance: announce POSTs this node's endpoint with the registry secret; list
 * GETs the roster and filters this node out. Network-free.
 */
import {ClusterFetch, HubClusterPeerRoster} from 'flyingfish_core';

type RecordedCall = {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
};

/**
 * A fetch stub that records every call and answers with a fixed roster body.
 */
const makeFetch = (rosterBody: unknown): {fetch: ClusterFetch; calls: RecordedCall[];} => {
    const calls: RecordedCall[] = [];

    const fetch: ClusterFetch = (url, init) => {
        calls.push({
            url: url,
            method: init?.method ?? 'GET',
            headers: init?.headers ?? {},
            body: init?.body
        });

        return Promise.resolve({json: (): Promise<unknown> => Promise.resolve(rosterBody)});
    };

    return {fetch: fetch, calls: calls};
};

describe('HubClusterPeerRoster', () => {
    test('announce POSTs this node endpoint with the registry secret', async() => {
        const {fetch, calls} = makeFetch({list: []});
        const roster = new HubClusterPeerRoster({
            hubUrl: 'http://hub:3000/',
            selfNodeUid: 'node-self',
            secret: 's3cret',
            fetchImpl: fetch
        });

        await roster.announce('10.0.0.5', 5335);

        expect(calls).toHaveLength(1);
        expect(calls[0].method).toBe('POST');
        // trailing slash on hubUrl is normalised away
        expect(calls[0].url).toBe('http://hub:3000/json/registry/cluster/announce');
        expect(calls[0].headers['x-flyingfish-registry-secret']).toBe('s3cret');
        expect(JSON.parse(calls[0].body!)).toEqual({nodeUid: 'node-self', host: '10.0.0.5', port: 5335});
    });

    test('list returns the other peers and filters self out', async() => {
        const {fetch, calls} = makeFetch({
            list: [
                {nodeUid: 'node-self', host: '10.0.0.5', port: 5335},
                {nodeUid: 'node-a', host: '10.0.0.1', port: 5335},
                {nodeUid: 'node-b', host: '10.0.0.2', port: 5335}
            ]
        });
        const roster = new HubClusterPeerRoster({
            hubUrl: 'http://hub:3000',
            selfNodeUid: 'node-self',
            secret: 's3cret',
            fetchImpl: fetch
        });

        const peers = await roster.list();

        expect(peers.map((peer) => peer.nodeUid)).toEqual(['node-a', 'node-b']);
        expect(calls[0].method).toBe('GET');
        expect(calls[0].url).toBe('http://hub:3000/json/registry/cluster/peers');
        expect(calls[0].headers['x-flyingfish-registry-secret']).toBe('s3cret');
    });

    test('list tolerates a roster body with no list field', async() => {
        const {fetch} = makeFetch({statusCode: 200});
        const roster = new HubClusterPeerRoster({
            hubUrl: 'http://hub:3000',
            selfNodeUid: 'node-self',
            fetchImpl: fetch
        });

        expect(await roster.list()).toEqual([]);
    });
});