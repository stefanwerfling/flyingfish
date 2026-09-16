/**
 * Unit tests for the cluster domain aggregation (Cluster/Mesh epic 9.5.12, phase 3):
 * a domain is identified cluster-wide by its NAME, so every node that published it is
 * collected under it — making it recognisable which nodes all manage a domain — and
 * the nodes are ordered by failover priority (for DNS-based high availability).
 * Non-domain and malformed entries are ignored. Pure function, network-free.
 */
import {
    aggregateClusterDomains,
    ClusterGossipStateEntry,
    clusterGossipNamespaceKey,
    clusterGossipParseKey
} from 'flyingfish_core';

const domainEntry = (nodeUid: string, id: number, name: string, priority: number): ClusterGossipStateEntry => ({
    key: clusterGossipNamespaceKey(nodeUid, `domain:${id}`),
    value: {id: id, name: name, priority: priority, disable: false, fix: false, recordless: false, parentId: 0}
});

describe('clusterGossipParseKey', () => {
    test('splits a namespaced key into nodeUid + hub-relative key, or null', () => {
        expect(clusterGossipParseKey('node-a/domain:5')).toEqual({nodeUid: 'node-a', key: 'domain:5'});
        expect(clusterGossipParseKey('node-a/hub')).toEqual({nodeUid: 'node-a', key: 'hub'});
        expect(clusterGossipParseKey('nonamespace')).toBeNull();
    });
});

describe('aggregateClusterDomains', () => {
    test('groups the same domain name across nodes and orders nodes by priority', () => {
        const domains = aggregateClusterDomains([
            {key: clusterGossipNamespaceKey('node-a', 'hub'), value: {host: 'a'}},
            domainEntry('node-a', 10, 'example.test', 5),
            domainEntry('node-b', 3, 'example.test', 0),
            domainEntry('node-b', 4, 'other.test', 0)
        ]);

        const example = domains.find((view) => view.name === 'example.test');
        expect(example).toBeDefined();
        // both nodes manage example.test; node-b (priority 0) is primary, node-a (5) is failover
        expect(example!.nodes.map((node) => node.nodeUid)).toEqual(['node-b', 'node-a']);
        expect(example!.nodes[0].id).toBe(3);
        expect(example!.nodes[1].priority).toBe(5);

        const other = domains.find((view) => view.name === 'other.test');
        expect(other!.nodes.map((node) => node.nodeUid)).toEqual(['node-b']);
    });

    test('ties on priority break on nodeUid for a stable failover order', () => {
        const [view] = aggregateClusterDomains([
            domainEntry('node-z', 1, 'd.test', 0),
            domainEntry('node-a', 2, 'd.test', 0)
        ]);

        expect(view.nodes.map((node) => node.nodeUid)).toEqual(['node-a', 'node-z']);
    });

    test('ignores non-domain entries, un-namespaced keys and malformed values', () => {
        const domains = aggregateClusterDomains([
            {key: clusterGossipNamespaceKey('node-a', 'hub'), value: {host: 'a'}},
            {key: 'domain:1', value: {name: 'no-namespace.test'}},
            {key: clusterGossipNamespaceKey('node-a', 'domain:9'), value: {id: 9}},
            {key: clusterGossipNamespaceKey('node-a', 'domain:8'), value: null}
        ]);

        expect(domains).toEqual([]);
    });
});