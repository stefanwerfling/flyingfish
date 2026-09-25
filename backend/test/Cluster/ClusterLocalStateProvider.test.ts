/**
 * Unit tests for the Hub's cluster local-state provider (Cluster/Mesh epic 9.5.12):
 * it publishes a hub descriptor, each of the Hub's domains as a `domain:<id>` summary
 * (phase 3), and — the shared rights DB (A+C, 7b) — the RBAC POLICY tables under
 * GLOBAL uuid keys (`global: true`, so the clusterserver does not namespace them). All
 * sources are injected, so no database is needed.
 */
import {ClusterLocalStateProvider, ClusterNodeGroupSnapshot, ClusterRbacPolicySnapshot} from '../../src/Application/Hub/ClusterLocalStateProvider.js';

const emptyPolicy = (): ClusterRbacPolicySnapshot => ({groups: [], roles: [], permissions: [], rolePermissions: [], assignments: []});
const emptyGroups = (): ClusterNodeGroupSnapshot => ({groups: [], members: [], shares: []});

describe('ClusterLocalStateProvider', () => {
    test('publishes a hub descriptor plus a domain:<id> summary per domain (priority + A-record IP)', async() => {
        const provider = new ClusterLocalStateProvider(
            async() => [
                {id: 1, domainname: 'a.test', disable: false, fixdomain: true, recordless: false, parent_id: 0, cluster_priority: 0},
                {id: 2, domainname: 'b.test', disable: true, fixdomain: false, recordless: true, parent_id: 1, cluster_priority: 5}
            ],
            async(domainId) => domainId === 1 ? '203.0.113.4' : undefined,
            async() => emptyPolicy(),
            async() => emptyGroups(),
            async() => []
        );

        const entries = await provider.entries();

        expect(entries[0].key).toBe('hub');
        expect(entries.map((entry) => entry.key)).toEqual(['hub', 'domain:1', 'domain:2']);

        // domains are per-node (not global) — no global flag set
        expect(entries[1].global).toBeUndefined();

        // priority reflects cluster_priority (9.5.14); ip is this node's A-record value
        expect(entries[1].value).toEqual({
            id: 1, name: 'a.test', priority: 0, ip: '203.0.113.4', disable: false, fix: true, recordless: false, parentId: 0
        });
        expect(entries[2].value).toEqual({
            id: 2, name: 'b.test', priority: 5, ip: undefined, disable: true, fix: false, recordless: true, parentId: 1
        });
    });

    test('publishes just the hub descriptor when there are no domains and no RBAC policy', async() => {
        const provider = new ClusterLocalStateProvider(async() => [], async() => undefined, async() => emptyPolicy(), async() => emptyGroups(), async() => []);
        const entries = await provider.entries();

        expect(entries.map((entry) => entry.key)).toEqual(['hub']);
    });

    test('publishes the RBAC policy tables under GLOBAL rbac_*:<uuid> keys (not user_group)', async() => {
        const provider = new ClusterLocalStateProvider(
            async() => [],
            async() => undefined,
            async() => ({
                groups: [{id: 'g1', name: 'Administrators', description: 'a', disable: false}],
                roles: [{id: 'r1', name: 'superadmin', description: 's'}],
                permissions: [{id: 'p1', permission_key: '*', description: 'all'}],
                rolePermissions: [{id: 'rp1', role_id: 'r1', permission_id: 'p1'}],
                assignments: [{id: 'a1', group_id: 'g1', role_id: 'r1', resource_type: '', resource_id: 0}]
            }),
            async() => emptyGroups(),
            async() => []
        );

        const entries = await provider.entries();

        expect(entries.map((entry) => entry.key)).toEqual([
            'hub',
            'rbac_group:g1',
            'rbac_role:r1',
            'rbac_permission:p1',
            'rbac_role_permission:rp1',
            'rbac_role_assignment:a1'
        ]);

        // every RBAC policy entry is published GLOBAL (converges on one cluster key)
        for (const rbacEntry of entries.filter((entry) => entry.key.startsWith('rbac_'))) {
            expect(rbacEntry.global).toBe(true);
        }

        expect(entries[1].value).toEqual({id: 'g1', name: 'Administrators', description: 'a', disable: false});
        expect(entries[5].value).toEqual({id: 'a1', group_id: 'g1', role_id: 'r1', resource_type: '', resource_id: 0});
    });

    test('publishes the node groups + memberships under GLOBAL node_group*:<uuid> keys (9.5.12.3)', async() => {
        const provider = new ClusterLocalStateProvider(
            async() => [],
            async() => undefined,
            async() => emptyPolicy(),
            async() => ({
                groups: [{id: 'ng1', name: 'Home LAN', description: 'trusted', color: '#12919f'}],
                members: [{id: 'ngm1', nodeUid: 'node-a', groupUuid: 'ng1'}],
                shares: []
            }),
            async() => []
        );

        const entries = await provider.entries();

        expect(entries.map((entry) => entry.key)).toEqual(['hub', 'node_group:ng1', 'node_group_member:ngm1']);

        // both node-group entries are published GLOBAL (converge on one cluster key)
        expect(entries[1].global).toBe(true);
        expect(entries[2].global).toBe(true);

        expect(entries[1].value).toEqual({id: 'ng1', name: 'Home LAN', description: 'trusted', color: '#12919f'});
        expect(entries[2].value).toEqual({id: 'ngm1', nodeUid: 'node-a', groupUuid: 'ng1'});
    });

    test('publishes node-group sharing rules under a GLOBAL node_group_share:<uuid> key (9.5.12.4)', async() => {
        const provider = new ClusterLocalStateProvider(
            async() => [],
            async() => undefined,
            async() => emptyPolicy(),
            async() => ({
                groups: [],
                members: [],
                shares: [{id: 'ngs1', nodeUid: 'node-a', groupUuid: 'ng1', resourceType: 'domain', level: 'write'}]
            }),
            async() => []
        );

        const entries = await provider.entries();

        expect(entries.map((entry) => entry.key)).toEqual(['hub', 'node_group_share:ngs1']);
        expect(entries[1].global).toBe(true);
        expect(entries[1].value).toEqual({id: 'ngs1', nodeUid: 'node-a', groupUuid: 'ng1', resourceType: 'domain', level: 'write'});
    });

    test('re-announces pending tombstones as deleted GLOBAL entries with a null value (9.5.12.8 fix)', async() => {
        const provider = new ClusterLocalStateProvider(
            async() => [],
            async() => undefined,
            async() => emptyPolicy(),
            async() => emptyGroups(),
            async() => ['node_group_share:ngs1', 'rbac_role_assignment:a1']
        );

        const entries = await provider.entries();

        expect(entries.map((entry) => entry.key)).toEqual(['hub', 'node_group_share:ngs1', 'rbac_role_assignment:a1']);
        expect(entries[1]).toEqual({key: 'node_group_share:ngs1', value: null, global: true, deleted: true});
        expect(entries[2]).toEqual({key: 'rbac_role_assignment:a1', value: null, global: true, deleted: true});
    });
});