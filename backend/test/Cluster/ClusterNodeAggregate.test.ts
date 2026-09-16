/**
 * Tests for the cluster node roster projection (Cluster/Mesh epic 9.5.12,
 * Proxmox-style node dashboard): the federated node list with each node's
 * online/offline state, derived purely from the converged gossip aggregate.
 * Pure/data-level, network-free.
 */
import {
    aggregateClusterNodes,
    ClusterGossipStateEntry,
    clusterGossipNamespaceKey
} from 'flyingfish_core';

const NOW = 1_000_000;

const nodeEntry = (nodeUid: string, heartbeatAgeMs: number, host = '10.0.0.1', port = 5336): ClusterGossipStateEntry => ({
    key: `node:${nodeUid}`,
    value: {nodeUid: nodeUid, host: host, port: port, heartbeat: NOW - heartbeatAgeMs}
});

describe('aggregateClusterNodes', () => {
    test('projects the node roster with online/offline from the heartbeat', () => {
        const nodes = aggregateClusterNodes([
            nodeEntry('node-b', 200000, '10.0.0.2', 5337),
            nodeEntry('node-a', 1000, '10.0.0.1', 5336)
        ], NOW, 90000);

        // ordered by nodeUid for a stable listing
        expect(nodes.map((n) => n.nodeUid)).toEqual(['node-a', 'node-b']);

        expect(nodes[0]).toEqual({
            nodeUid: 'node-a',
            host: '10.0.0.1',
            port: 5336,
            lastHeartbeat: NOW - 1000,
            online: true
        });

        // stale heartbeat → offline, descriptor still listed
        expect(nodes[1].online).toBe(false);
        expect(nodes[1].host).toBe('10.0.0.2');
    });

    test('ignores non-node and namespaced-domain entries', () => {
        const nodes = aggregateClusterNodes([
            {key: clusterGossipNamespaceKey('node-a', 'domain:1'), value: {id: 1, name: 'x.test', priority: 0}},
            {key: 'hub', value: {host: 'somehost'}},
            nodeEntry('node-a', 1000)
        ], NOW, 90000);

        expect(nodes.map((n) => n.nodeUid)).toEqual(['node-a']);
    });

    test('drops malformed node descriptors (no nodeUid / no heartbeat / null)', () => {
        const nodes = aggregateClusterNodes([
            {key: 'node:bad-1', value: {nodeUid: 'bad-1'}},
            {key: 'node:bad-2', value: {heartbeat: NOW}},
            {key: 'node:bad-3', value: null},
            nodeEntry('good', 1000)
        ], NOW, 90000);

        expect(nodes.map((n) => n.nodeUid)).toEqual(['good']);
    });

    test('last-writer per nodeUid wins (no duplicate rows)', () => {
        const nodes = aggregateClusterNodes([
            nodeEntry('node-a', 200000, 'old-host'),
            nodeEntry('node-a', 500, 'new-host')
        ], NOW, 90000);

        expect(nodes).toHaveLength(1);
        expect(nodes[0].host).toBe('new-host');
        expect(nodes[0].online).toBe(true);
    });

    test('defaults missing host/port defensively without dropping the node', () => {
        const nodes = aggregateClusterNodes([
            {key: 'node:node-a', value: {nodeUid: 'node-a', heartbeat: NOW - 1000}}
        ], NOW, 90000);

        expect(nodes[0]).toEqual({
            nodeUid: 'node-a',
            host: '',
            port: 0,
            lastHeartbeat: NOW - 1000,
            online: true
        });
    });
});