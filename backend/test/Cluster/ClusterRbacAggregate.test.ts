/**
 * Tests for the cluster-global RBAC policy projection (Cluster/Mesh epic 9.5.12, A+C
 * shared rights DB): the group/role/permission/grant tables aggregated from the gossip
 * under their global, cluster-stable UUID keys — one shared policy set. Verifies each
 * table is collected, per-node/domain/hub entries are ignored, malformed values are
 * dropped, and the `rbac_role:`/`rbac_role_permission:`/`rbac_role_assignment:` key
 * prefixes do not collide. Pure/data-level, network-free.
 */
import {
    aggregateClusterRbac,
    ClusterGossipStateEntry,
    clusterGossipNamespaceKey
} from 'flyingfish_core';

const entry = (key: string, value: unknown): ClusterGossipStateEntry => ({key: key, value: value});
const tombstone = (key: string): ClusterGossipStateEntry => ({key: key, value: null, deleted: true});

describe('aggregateClusterRbac', () => {
    test('collects every rbac_* policy table from its global uuid key, ordered by id', () => {
        const view = aggregateClusterRbac([
            entry('rbac_group:g2', {id: 'g2', name: 'Editors', description: 'e', disable: false}),
            entry('rbac_group:g1', {id: 'g1', name: 'Administrators', description: 'a', disable: false}),
            entry('rbac_role:r1', {id: 'r1', name: 'superadmin', description: 's'}),
            entry('rbac_permission:p1', {id: 'p1', permission_key: '*', description: 'all'}),
            entry('rbac_role_permission:rp1', {id: 'rp1', role_id: 'r1', permission_id: 'p1'}),
            entry('rbac_role_assignment:a1', {id: 'a1', group_id: 'g1', role_id: 'r1', resource_type: '', resource_id: 0}),
            entry('rbac_role_assignment:a2', {id: 'a2', group_id: 'g2', role_id: 'r1', resource_type: 'domain', resource_id: 5})
        ]);

        // groups ordered by id (g1 before g2)
        expect(view.groups.map((group) => group.id)).toEqual(['g1', 'g2']);
        expect(view.groups[0]).toEqual({id: 'g1', name: 'Administrators', description: 'a', disable: false});

        expect(view.roles).toEqual([{id: 'r1', name: 'superadmin', description: 's'}]);
        expect(view.permissions).toEqual([{id: 'p1', permission_key: '*', description: 'all'}]);
        expect(view.rolePermissions).toEqual([{id: 'rp1', role_id: 'r1', permission_id: 'p1'}]);

        // role_permission and role_assignment keys are NOT mis-parsed as roles
        expect(view.assignments.map((assignment) => assignment.id)).toEqual(['a1', 'a2']);
        expect(view.assignments[1]).toEqual({id: 'a2', group_id: 'g2', role_id: 'r1', resource_type: 'domain', resource_id: 5, resource_uuid: ''});
    });

    test('ignores per-node domain/hub/node entries and non-rbac keys', () => {
        const view = aggregateClusterRbac([
            entry('hub', {host: 'h'}),
            entry('node:abc', {nodeUid: 'abc', heartbeat: 1}),
            entry(clusterGossipNamespaceKey('abc', 'domain:1'), {id: 1, name: 'x.test'}),
            entry('rbac_group:g1', {id: 'g1', name: 'G', description: '', disable: false})
        ]);

        expect(view.groups.map((group) => group.id)).toEqual(['g1']);
        expect(view.roles).toEqual([]);
        expect(view.permissions).toEqual([]);
        expect(view.assignments).toEqual([]);
    });

    test('drops malformed values but keeps well-formed rows (defensive coercion)', () => {
        const view = aggregateClusterRbac([
            entry('rbac_group:bad', null),
            entry('rbac_group:g1', {id: 'g1', name: 'G', description: '', disable: true}),
            // missing fields coerce to defaults rather than throwing
            entry('rbac_role:r1', {id: 'r1'}),
            entry('rbac_role_assignment:a1', {id: 'a1', group_id: 'g1', role_id: 'r1'})
        ]);

        expect(view.groups).toEqual([{id: 'g1', name: 'G', description: '', disable: true}]);
        expect(view.roles).toEqual([{id: 'r1', name: '', description: ''}]);
        expect(view.assignments).toEqual([{id: 'a1', group_id: 'g1', role_id: 'r1', resource_type: '', resource_id: 0, resource_uuid: ''}]);
    });

    test('collects a UUID-scoped assignment (node-group, Cluster/Mesh 9.5.12.4)', () => {
        const view = aggregateClusterRbac([
            entry('rbac_role_assignment:a1', {id: 'a1', group_id: 'g1', role_id: 'r1', resource_type: 'node-group', resource_uuid: 'ng-1'})
        ]);

        expect(view.assignments).toEqual([{id: 'a1', group_id: 'g1', role_id: 'r1', resource_type: 'node-group', resource_id: 0, resource_uuid: 'ng-1'}]);
    });

    test('a tombstoned entry is excluded from the live view and its id collected into tombstones, by prefix (9.5.12.8 fix)', () => {
        const view = aggregateClusterRbac([
            entry('rbac_group:g1', {id: 'g1', name: 'Administrators', description: '', disable: false}),
            tombstone('rbac_group:g2'),
            entry('rbac_role:r1', {id: 'r1', name: 'admin', description: ''}),
            tombstone('rbac_role:r2'),
            entry('rbac_permission:p1', {id: 'p1', permission_key: '*', description: ''}),
            tombstone('rbac_permission:p2'),
            entry('rbac_role_permission:rp1', {id: 'rp1', role_id: 'r1', permission_id: 'p1'}),
            tombstone('rbac_role_permission:rp2'),
            entry('rbac_role_assignment:a1', {id: 'a1', group_id: 'g1', role_id: 'r1', resource_type: '', resource_id: 0}),
            tombstone('rbac_role_assignment:a2')
        ]);

        expect(view.groups.map((group) => group.id)).toEqual(['g1']);
        expect(view.roles.map((role) => role.id)).toEqual(['r1']);
        expect(view.permissions.map((permission) => permission.id)).toEqual(['p1']);
        expect(view.rolePermissions.map((rp) => rp.id)).toEqual(['rp1']);
        expect(view.assignments.map((assignment) => assignment.id)).toEqual(['a1']);
        expect(view.tombstones).toEqual({
            groupIds: ['g2'], roleIds: ['r2'], permissionIds: ['p2'], rolePermissionIds: ['rp2'], assignmentIds: ['a2']
        });
    });
});