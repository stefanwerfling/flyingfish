/**
 * Tests for the cluster-global node-group projection (Cluster/Mesh epic 9.5.12.3/.4): the
 * groups + memberships + sharing rules aggregated from the gossip under their global,
 * cluster-stable UUID keys — one shared set. Verifies groups/members/shares are collected,
 * per-node/hub/rbac entries are ignored, malformed values are dropped, and the
 * `node_group:` / `node_group_member:` / `node_group_share:` key prefixes do not collide
 * (the longer prefixes must not be mis-parsed as a group). Pure/data-level, network-free.
 */
import {
    aggregateClusterNodeGroups,
    ClusterGossipStateEntry
} from 'flyingfish_core';

const entry = (key: string, value: unknown): ClusterGossipStateEntry => ({key: key, value: value});

describe('aggregateClusterNodeGroups', () => {
    test('collects groups + members from their global uuid keys, ordered by id', () => {
        const view = aggregateClusterNodeGroups([
            entry('node_group:g2', {id: 'g2', name: 'Edge', description: 'public', color: '#a855c9'}),
            entry('node_group:g1', {id: 'g1', name: 'Home LAN', description: 'trusted', color: '#12919f'}),
            entry('node_group_member:m1', {id: 'm1', nodeUid: 'node-a', groupUuid: 'g1'}),
            entry('node_group_member:m2', {id: 'm2', nodeUid: 'node-b', groupUuid: 'g1'})
        ]);

        // groups ordered by id (g1 before g2)
        expect(view.groups.map((group) => group.id)).toEqual(['g1', 'g2']);
        expect(view.groups[0]).toEqual({id: 'g1', name: 'Home LAN', description: 'trusted', color: '#12919f'});

        // node_group_member keys are NOT mis-parsed as groups
        expect(view.groups.map((group) => group.id)).not.toContain('m1');
        expect(view.members.map((member) => member.id)).toEqual(['m1', 'm2']);
        expect(view.members[1]).toEqual({id: 'm2', nodeUid: 'node-b', groupUuid: 'g1'});
    });

    test('ignores unrelated (per-node / hub / rbac) entries and malformed values', () => {
        const view = aggregateClusterNodeGroups([
            entry('hub', {host: 'nuc'}),
            entry('node:node-a', {nodeUid: 'node-a', host: '10.0.0.1'}),
            entry('rbac_group:r1', {id: 'r1', name: 'Admins', description: '', disable: false}),
            entry('node-a/domain:5', {id: 5, name: 'example.com'}),
            entry('node_group:bad', null),
            entry('node_group:bad2', 'not-an-object'),
            entry('node_group:g1', {id: 'g1', name: 'Core', description: '', color: ''})
        ]);

        expect(view.groups).toEqual([{id: 'g1', name: 'Core', description: '', color: ''}]);
        expect(view.members).toEqual([]);
    });

    test('defaults missing fields to empty strings', () => {
        const view = aggregateClusterNodeGroups([
            entry('node_group:g1', {id: 'g1'}),
            entry('node_group_member:m1', {id: 'm1'}),
            entry('node_group_share:s1', {id: 's1'})
        ]);

        expect(view.groups[0]).toEqual({id: 'g1', name: '', description: '', color: ''});
        expect(view.members[0]).toEqual({id: 'm1', nodeUid: '', groupUuid: ''});
        expect(view.shares[0]).toEqual({id: 's1', nodeUid: '', groupUuid: '', resourceType: '', level: ''});
    });

    test('collects shares and does not mis-parse the `node_group_share:` prefix as a group or a member', () => {
        const view = aggregateClusterNodeGroups([
            entry('node_group:g1', {id: 'g1', name: 'Home LAN', description: '', color: ''}),
            entry('node_group_member:m1', {id: 'm1', nodeUid: 'node-a', groupUuid: 'g1'}),
            entry('node_group_share:s2', {id: 's2', nodeUid: 'node-b', groupUuid: 'g1', resourceType: 'domain', level: 'write'}),
            entry('node_group_share:s1', {id: 's1', nodeUid: 'node-a', groupUuid: 'g1', resourceType: 'domain', level: 'read'})
        ]);

        expect(view.groups.map((group) => group.id)).toEqual(['g1']);
        expect(view.members.map((member) => member.id)).toEqual(['m1']);
        // ordered by id (s1 before s2)
        expect(view.shares.map((share) => share.id)).toEqual(['s1', 's2']);
        expect(view.shares[0]).toEqual({id: 's1', nodeUid: 'node-a', groupUuid: 'g1', resourceType: 'domain', level: 'read'});
    });
});