/**
 * Tests for the cluster node liveness signal (Cluster/Mesh epic 9.5.14, HA): a node
 * is live if its gossiped heartbeat is within the stale window. An integration test
 * chains liveness with the domain aggregation + failover resolver to prove the whole
 * HA decision: the domain's active node fails over from a stale primary to the next
 * live node. Pure/data-level, network-free.
 */
import {
    aggregateClusterDomains,
    ClusterGossipStateEntry,
    clusterGossipNamespaceKey,
    clusterLiveNodeUids,
    resolveDomainActiveNode
} from 'flyingfish_core';

const NOW = 1_000_000;

const nodeEntry = (nodeUid: string, heartbeatAgeMs: number): ClusterGossipStateEntry => ({
    key: `node:${nodeUid}`,
    value: {nodeUid: nodeUid, host: '10.0.0.1', port: 5336, heartbeat: NOW - heartbeatAgeMs}
});

const domainEntry = (nodeUid: string, id: number, name: string, priority: number, ip: string): ClusterGossipStateEntry => ({
    key: clusterGossipNamespaceKey(nodeUid, `domain:${id}`),
    value: {id: id, name: name, priority: priority, ip: ip, disable: false, fix: false, recordless: false, parentId: 0}
});

describe('clusterLiveNodeUids', () => {
    test('a fresh heartbeat is live, a stale one is not', () => {
        const live = clusterLiveNodeUids([
            nodeEntry('node-fresh', 1000),
            nodeEntry('node-stale', 200000)
        ], NOW, 90000);

        expect(live.has('node-fresh')).toBe(true);
        expect(live.has('node-stale')).toBe(false);
    });

    test('ignores non-node entries and descriptors without a heartbeat', () => {
        const live = clusterLiveNodeUids([
            domainEntry('node-a', 1, 'x.test', 0, '10.0.0.1'),
            {key: 'node:node-b', value: {nodeUid: 'node-b'}},
            {key: 'node:node-c', value: null}
        ], NOW, 90000);

        expect(live.size).toBe(0);
    });
});

describe('domain HA end-to-end (aggregate + liveness + failover resolve)', () => {
    test('the active node fails over from a stale primary to the next live node', () => {
        const entries: ClusterGossipStateEntry[] = [
            nodeEntry('node-primary', 1000),
            nodeEntry('node-backup', 1000),
            domainEntry('node-primary', 1, 'ha.test', 0, '203.0.113.1'),
            domainEntry('node-backup', 2, 'ha.test', 10, '203.0.113.2')
        ];

        const [view] = aggregateClusterDomains(entries);

        // both live → primary (priority 0) is active; its IP is what the A record answers
        const active1 = resolveDomainActiveNode(view, clusterLiveNodeUids(entries, NOW, 90000));
        expect(active1?.nodeUid).toBe('node-primary');
        expect(active1?.ip).toBe('203.0.113.1');

        // primary heartbeat goes stale → failover to the backup, and the A-record IP follows
        const stale: ClusterGossipStateEntry[] = [
            nodeEntry('node-primary', 200000),
            nodeEntry('node-backup', 1000),
            domainEntry('node-primary', 1, 'ha.test', 0, '203.0.113.1'),
            domainEntry('node-backup', 2, 'ha.test', 10, '203.0.113.2')
        ];
        const active2 = resolveDomainActiveNode(view, clusterLiveNodeUids(stale, NOW, 90000));
        expect(active2?.nodeUid).toBe('node-backup');
        expect(active2?.ip).toBe('203.0.113.2');
    });
});