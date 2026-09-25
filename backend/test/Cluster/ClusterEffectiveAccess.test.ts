/**
 * Tests for the effective-access preview (Cluster/Mesh epic 9.5.12.5): joins a node's
 * sharing rules with the RBAC roles granted on the same node group, resolved to
 * permission keys. Verifies the join, that a share with no matching grant yields nothing
 * (default-deny), that an unrelated (int-scoped or differently-scoped) assignment is
 * ignored, and that permission keys resolve through role_permissions. Pure/data-level.
 */
import {
    ClusterNodeGroupView,
    ClusterRbacView,
    computeClusterEffectiveAccess
} from 'flyingfish_core';

const emptyNodeGroups = (): ClusterNodeGroupView => ({groups: [], members: [], shares: [], tombstones: {groupIds: [], memberIds: [], shareIds: []}});
const emptyRbac = (): ClusterRbacView => ({
    groups: [], roles: [], permissions: [], rolePermissions: [], assignments: [],
    tombstones: {groupIds: [], roleIds: [], permissionIds: [], rolePermissionIds: [], assignmentIds: []}
});

describe('computeClusterEffectiveAccess', () => {
    test('joins a share with the role granted on its group, resolved to permission keys', () => {
        const nodeGroups: ClusterNodeGroupView = {
            ...emptyNodeGroups(),
            groups: [{id: 'g1', name: 'Site A', description: '', color: ''}],
            shares: [{id: 's1', nodeUid: 'node-a', groupUuid: 'g1', resourceType: 'domain', level: 'write'}]
        };
        const rbac: ClusterRbacView = {
            ...emptyRbac(),
            roles: [{id: 'r1', name: 'viewer', description: ''}],
            permissions: [
                {id: 'p1', permission_key: 'domain.read', description: ''},
                {id: 'p2', permission_key: 'domain.write', description: ''}
            ],
            rolePermissions: [
                {id: 'rp1', role_id: 'r1', permission_id: 'p1'},
                {id: 'rp2', role_id: 'r1', permission_id: 'p2'}
            ],
            assignments: [{id: 'a1', group_id: 'ug1', role_id: 'r1', resource_type: 'node-group', resource_id: 0, resource_uuid: 'g1'}]
        };

        const entries = computeClusterEffectiveAccess(nodeGroups, rbac);

        expect(entries).toEqual([{
            nodeUid: 'node-a',
            resourceType: 'domain',
            level: 'write',
            groupUuid: 'g1',
            groupName: 'Site A',
            roleId: 'r1',
            roleName: 'viewer',
            permissionKeys: ['domain.read', 'domain.write']
        }]);
    });

    test('a share with no matching grant on its group yields nothing (default-deny)', () => {
        const nodeGroups: ClusterNodeGroupView = {
            ...emptyNodeGroups(),
            shares: [{id: 's1', nodeUid: 'node-a', groupUuid: 'g1', resourceType: 'domain', level: 'read'}]
        };
        const rbac: ClusterRbacView = {
            ...emptyRbac(),
            roles: [{id: 'r1', name: 'viewer', description: ''}],
            // assignment scoped to a DIFFERENT group — must not leak into g1's access
            assignments: [{id: 'a1', group_id: 'ug1', role_id: 'r1', resource_type: 'node-group', resource_id: 0, resource_uuid: 'g2'}]
        };

        expect(computeClusterEffectiveAccess(nodeGroups, rbac)).toEqual([]);
    });

    test('ignores assignments not scoped to node-group (global or int-scoped)', () => {
        const nodeGroups: ClusterNodeGroupView = {
            ...emptyNodeGroups(),
            shares: [{id: 's1', nodeUid: 'node-a', groupUuid: 'g1', resourceType: 'domain', level: 'read'}]
        };
        const rbac: ClusterRbacView = {
            ...emptyRbac(),
            roles: [{id: 'r1', name: 'admin', description: ''}, {id: 'r2', name: 'editor', description: ''}],
            assignments: [
                // global grant (empty resource_type) — not a node-group scope, must not match
                {id: 'a1', group_id: 'ug1', role_id: 'r1', resource_type: '', resource_id: 0, resource_uuid: ''},
                // int-scoped domain grant — different resource_type, must not match
                {id: 'a2', group_id: 'ug1', role_id: 'r2', resource_type: 'domain', resource_id: 5, resource_uuid: ''}
            ]
        };

        expect(computeClusterEffectiveAccess(nodeGroups, rbac)).toEqual([]);
    });

    test('one share can be granted via multiple roles, each producing its own row', () => {
        const nodeGroups: ClusterNodeGroupView = {
            ...emptyNodeGroups(),
            groups: [{id: 'g1', name: 'Site A', description: '', color: ''}],
            shares: [{id: 's1', nodeUid: 'node-a', groupUuid: 'g1', resourceType: 'domain', level: 'read'}]
        };
        const rbac: ClusterRbacView = {
            ...emptyRbac(),
            roles: [{id: 'r1', name: 'viewer', description: ''}, {id: 'r2', name: 'auditor', description: ''}],
            permissions: [{id: 'p1', permission_key: 'domain.read', description: ''}],
            rolePermissions: [{id: 'rp1', role_id: 'r1', permission_id: 'p1'}],
            assignments: [
                {id: 'a1', group_id: 'ug1', role_id: 'r1', resource_type: 'node-group', resource_id: 0, resource_uuid: 'g1'},
                {id: 'a2', group_id: 'ug2', role_id: 'r2', resource_type: 'node-group', resource_id: 0, resource_uuid: 'g1'}
            ]
        };

        const entries = computeClusterEffectiveAccess(nodeGroups, rbac);

        expect(entries.map((entry) => entry.roleName)).toEqual(['auditor', 'viewer']);
        // auditor holds no role_permissions rows -> resolves to an empty key list, not an error
        expect(entries.find((entry) => entry.roleName === 'auditor')?.permissionKeys).toEqual([]);
    });
});
