/**
 * Unit tests for the versioned LWW gossip store (Cluster/Mesh epic 9.5.12,
 * gossip-core): local writes stamp a Lamport+nodeUid version, merge keeps the newer
 * version and advances the clock, concurrent same-key writes converge deterministically
 * on the nodeUid tiebreak, and tombstones propagate deletes. Two independent stores
 * fed each other's entries reach identical live state. Network-free.
 */
import {ClusterGossipEntry, ClusterGossipStore, clusterGossipVersionNewer} from 'flyingfish_core';

describe('clusterGossipVersionNewer', () => {
    test('higher lamport wins; ties break on the greater nodeUid', () => {
        expect(clusterGossipVersionNewer({lamport: 2, nodeUid: 'a'}, {lamport: 1, nodeUid: 'z'})).toBe(true);
        expect(clusterGossipVersionNewer({lamport: 1, nodeUid: 'a'}, {lamport: 2, nodeUid: 'z'})).toBe(false);
        expect(clusterGossipVersionNewer({lamport: 5, nodeUid: 'b'}, {lamport: 5, nodeUid: 'a'})).toBe(true);
        expect(clusterGossipVersionNewer({lamport: 5, nodeUid: 'a'}, {lamport: 5, nodeUid: 'b'})).toBe(false);
    });
});

describe('ClusterGossipStore (local writes)', () => {
    test('set/get/has and remove tombstone', () => {
        const store = new ClusterGossipStore('node-a');

        store.set('k', {v: 1});
        expect(store.get('k')).toEqual({v: 1});
        expect(store.has('k')).toBe(true);

        store.remove('k');
        expect(store.get('k')).toBeUndefined();
        expect(store.has('k')).toBe(false);
        // the tombstone is still an entry (for propagation) but not live
        expect(store.entries()).toHaveLength(1);
        expect(store.liveEntries()).toHaveLength(0);
    });

    test('each local write bumps the Lamport clock and stamps this node', () => {
        const store = new ClusterGossipStore('node-a');

        const first = store.set('k1', 1);
        const second = store.set('k2', 2);

        expect(first.version).toEqual({lamport: 1, nodeUid: 'node-a'});
        expect(second.version).toEqual({lamport: 2, nodeUid: 'node-a'});
        expect(store.lamport()).toBe(2);
    });

    test('setIfChanged writes only on a real change (no version churn)', () => {
        const store = new ClusterGossipStore('node-a');

        expect(store.setIfChanged('k', {a: 1})).toBe(true);
        expect(store.lamport()).toBe(1);

        // same value (deep-equal) → no write, no bump
        expect(store.setIfChanged('k', {a: 1})).toBe(false);
        expect(store.lamport()).toBe(1);

        // changed value → write + bump
        expect(store.setIfChanged('k', {a: 2})).toBe(true);
        expect(store.lamport()).toBe(2);

        // a tombstoned key is revived by setIfChanged even with the old value
        store.remove('k');
        expect(store.setIfChanged('k', {a: 2})).toBe(true);
        expect(store.has('k')).toBe(true);
    });
});

describe('ClusterGossipStore (merge / convergence)', () => {
    test('merge adopts a strictly newer entry and advances the Lamport clock', () => {
        const store = new ClusterGossipStore('node-a');
        store.set('k', 'local');

        const remote: ClusterGossipEntry = {key: 'k', value: 'remote', version: {lamport: 9, nodeUid: 'node-b'}, deleted: false};
        expect(store.merge(remote)).toBe(true);
        expect(store.get('k')).toBe('remote');
        // clock advanced past the observed version, so the next local write outranks it
        expect(store.lamport()).toBe(9);
        expect(store.set('k', 'local2').version.lamport).toBe(10);
    });

    test('merge ignores an older or equal entry', () => {
        const store = new ClusterGossipStore('node-z');
        // local version is {lamport:1, nodeUid:'node-z'}
        const local = store.set('k', 'local');

        const older: ClusterGossipEntry = {key: 'k', value: 'old', version: {lamport: 1, nodeUid: 'node-a'}, deleted: false};
        expect(store.merge(older)).toBe(false);
        expect(store.get('k')).toBe('local');
        expect(local.version.nodeUid).toBe('node-z');
    });

    test('a remote tombstone deletes a locally-live key when newer', () => {
        const store = new ClusterGossipStore('node-a');
        store.set('k', 'live');

        const tombstone: ClusterGossipEntry = {key: 'k', value: null, version: {lamport: 5, nodeUid: 'node-b'}, deleted: true};
        expect(store.merge(tombstone)).toBe(true);
        expect(store.has('k')).toBe(false);
    });

    test('two stores exchanging all entries converge to identical live state', () => {
        const a = new ClusterGossipStore('node-a');
        const b = new ClusterGossipStore('node-b');

        a.set('shared', 'from-a');
        // concurrent write to the same key
        b.set('shared', 'from-b');
        a.set('only-a', 1);
        b.set('only-b', 2);
        // b never had only-a; the tombstone still propagates
        b.remove('only-a');

        // full bidirectional exchange
        for (const entry of a.entries()) {
            b.merge(entry);
        }

        for (const entry of b.entries()) {
            a.merge(entry);
        }

        const live = (store: ClusterGossipStore): Record<string, unknown> =>
            Object.fromEntries(store.liveEntries().map((entry) => [entry.key, entry.value]));

        // both converge to the same map; 'shared' resolves to node-b (greater nodeUid tiebreak
        // at equal lamport), only-a is tombstoned away, only-b survives
        expect(live(a)).toEqual(live(b));
        expect(live(a)).toEqual({'shared': 'from-b', 'only-b': 2});
    });
});