/**
 * Tests for the cluster member-CA set projection (Cluster/Mesh epic 9.5.12.2,
 * model (b) CA cross-trust): every node gossips its own CA chain; the mesh trust
 * anchor set is the de-duplicated union of all members' chains. Pure/data-level.
 */
import {
    aggregateClusterCaSet,
    ClusterGossipStateEntry,
    clusterTrustChain
} from 'flyingfish_core';

const caEntry = (nodeUid: string, chain: unknown, rootFingerprint: unknown = 'AA:BB'): ClusterGossipStateEntry => ({
    key: `ca:${nodeUid}`,
    value: {nodeUid: nodeUid, chain: chain, rootFingerprint: rootFingerprint}
});

describe('aggregateClusterCaSet', () => {
    test('projects one member-CA entry per node, ordered by nodeUid', () => {
        const set = aggregateClusterCaSet([
            caEntry('node-b', ['-B-INT-', '-B-ROOT-'], 'BB'),
            caEntry('node-a', ['-A-ROOT-'], 'AA')
        ]);

        expect(set.map((entry) => entry.nodeUid)).toStrictEqual(['node-a', 'node-b']);
        expect(set[0]).toStrictEqual({nodeUid: 'node-a', chain: ['-A-ROOT-'], rootFingerprint: 'AA'});
        expect(set[1].chain).toStrictEqual(['-B-INT-', '-B-ROOT-']);
    });

    test('ignores non-ca entries and namespaced keys', () => {
        const set = aggregateClusterCaSet([
            {key: 'node:node-a', value: {nodeUid: 'node-a', heartbeat: 1}},
            {key: 'node-a/ca:x', value: {nodeUid: 'x', chain: ['-X-']}},
            caEntry('node-a', ['-A-'])
        ]);

        expect(set).toHaveLength(1);
        expect(set[0].nodeUid).toBe('node-a');
    });

    test('drops malformed entries (no nodeUid / no chain / empty chain / non-string PEMs)', () => {
        const set = aggregateClusterCaSet([
            {key: 'ca:x', value: {chain: ['-X-']}},
            {key: 'ca:y', value: {nodeUid: 'y'}},
            {key: 'ca:z', value: {nodeUid: 'z', chain: []}},
            {key: 'ca:w', value: {nodeUid: 'w', chain: [123, '  ']}},
            {key: 'ca:v', value: null}
        ]);

        expect(set).toHaveLength(0);
    });

    test('last writer per nodeUid wins (no duplicate rows)', () => {
        const set = aggregateClusterCaSet([
            caEntry('node-a', ['-OLD-']),
            caEntry('node-a', ['-NEW-'])
        ]);

        expect(set).toHaveLength(1);
        expect(set[0].chain).toStrictEqual(['-NEW-']);
    });

    test('missing rootFingerprint defaults to empty without dropping the entry', () => {
        const set = aggregateClusterCaSet([{key: 'ca:node-a', value: {nodeUid: 'node-a', chain: ['-A-']}}]);

        expect(set[0].rootFingerprint).toBe('');
    });
});

describe('clusterTrustChain', () => {
    test('is the de-duplicated union of all member chains plus the own chain', () => {
        const set = aggregateClusterCaSet([
            caEntry('node-a', ['-A-ROOT-']),
            caEntry('node-b', ['-SHARED-INT-', '-B-ROOT-'])
        ]);

        const trust = clusterTrustChain(set, ['-OWN-', '-SHARED-INT-']);

        // own chain first, then members, shared PEM appears once
        expect(trust).toStrictEqual(['-OWN-', '-SHARED-INT-', '-A-ROOT-', '-B-ROOT-']);
    });

    test('works with no own chain (self ca: already converged)', () => {
        const trust = clusterTrustChain(aggregateClusterCaSet([caEntry('node-a', ['-A-'])]));

        expect(trust).toStrictEqual(['-A-']);
    });
});
