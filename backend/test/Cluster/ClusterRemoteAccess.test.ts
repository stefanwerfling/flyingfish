/**
 * Tests for the cross-node resource access check (Cluster/Mesh epic 9.5.12.4/.6):
 * whether a local user may perform an action against a REMOTE node's resources. Two
 * gates: the target node must have shared the resource type at a covering level, AND
 * the user must hold the permission via an RBAC grant scoped to that same group.
 * Evaluated entirely against local data via a fake IRbacDataSource — no mesh needed.
 * This is the local half of the eventual mesh RPC; the actual request/response over
 * ClusterControl is a separate, not-yet-built piece.
 */
import {canAccessRemoteResource, ClusterShareLike, IRbacDataSource, nodeStillSharesResource, PermissionService, RbacAssignment} from 'flyingfish_core';

const createSource = (model: {
    userGroups: Record<number, string[]>;
    groupAssignments: Record<string, RbacAssignment[]>;
    rolePermissions: Record<string, string[]>;
}): IRbacDataSource => ({
    groupIdsForUser: async(userId: number): Promise<string[]> => model.userGroups[userId] ?? [],
    assignmentsForGroups: async(groupIds: string[]): Promise<RbacAssignment[]> =>
        groupIds.flatMap((groupId) => model.groupAssignments[groupId] ?? []),
    permissionKeysForRoles: async(roleIds: string[]): Promise<string[]> =>
        roleIds.flatMap((roleId) => model.rolePermissions[roleId] ?? [])
});

const nodeGroupGrant = (roleId: string, groupUuid: string): RbacAssignment =>
    ({roleId: roleId, resourceType: 'node-group', resourceId: 0, resourceUuid: groupUuid});

const shares: ClusterShareLike[] = [
    {nodeUid: 'node-b', groupUuid: 'g1', resourceType: 'domain', level: 'write'},
    {nodeUid: 'node-b', groupUuid: 'g2', resourceType: 'domain', level: 'read'},
    {nodeUid: 'node-c', groupUuid: 'g1', resourceType: 'domain', level: 'write'}
];

describe('canAccessRemoteResource', () => {
    test('allowed: the target node shares the type at a covering level, and the user holds the permission via that group', async() => {
        const permission = new PermissionService(createSource({
            userGroups: {1: ['ug1']},
            groupAssignments: {ug1: [nodeGroupGrant('r1', 'g1')]},
            rolePermissions: {r1: ['domain.write']}
        }));

        expect(await canAccessRemoteResource(permission, 1, 'node-b', 'domain', 'domain.write', 'write', shares)).toBe(true);
    });

    test('denied: the user\'s grant is scoped to a group the target node did NOT share the type with', async() => {
        const permission = new PermissionService(createSource({
            userGroups: {1: ['ug1']},
            // grant is on g3 — node-b never shared "domain" with g3
            groupAssignments: {ug1: [nodeGroupGrant('r1', 'g3')]},
            rolePermissions: {r1: ['domain.write']}
        }));

        expect(await canAccessRemoteResource(permission, 1, 'node-b', 'domain', 'domain.write', 'read', shares)).toBe(false);
    });

    test('denied: the share only grants read, but a write is required', async() => {
        const permission = new PermissionService(createSource({
            userGroups: {1: ['ug1']},
            groupAssignments: {ug1: [nodeGroupGrant('r1', 'g2')]}, // g2's share level is 'read'
            rolePermissions: {r1: ['domain.read', 'domain.write']}
        }));

        expect(await canAccessRemoteResource(permission, 1, 'node-b', 'domain', 'domain.write', 'write', shares)).toBe(false);
        // the same share DOES cover a read check
        expect(await canAccessRemoteResource(permission, 1, 'node-b', 'domain', 'domain.read', 'read', shares)).toBe(true);
    });

    test('denied: the user has no role granting the required permission, even though the share exists', async() => {
        const permission = new PermissionService(createSource({
            userGroups: {1: ['ug1']},
            groupAssignments: {ug1: [nodeGroupGrant('r1', 'g1')]},
            rolePermissions: {r1: ['domain.read']} // no domain.write
        }));

        expect(await canAccessRemoteResource(permission, 1, 'node-b', 'domain', 'domain.write', 'write', shares)).toBe(false);
    });

    test('denied: right group and permission, but for a different target node', async() => {
        const permission = new PermissionService(createSource({
            userGroups: {1: ['ug1']},
            groupAssignments: {ug1: [nodeGroupGrant('r1', 'g1')]},
            rolePermissions: {r1: ['domain.write']}
        }));

        // g1 is shared by node-b AND node-c, but we ask about node-d
        expect(await canAccessRemoteResource(permission, 1, 'node-d', 'domain', 'domain.write', 'read', shares)).toBe(false);
    });

    test('allowed: a superadmin wildcard grant scoped to the group still satisfies the check', async() => {
        const permission = new PermissionService(createSource({
            userGroups: {1: ['ug1']},
            groupAssignments: {ug1: [nodeGroupGrant('r1', 'g2')]},
            rolePermissions: {r1: ['*']}
        }));

        expect(await canAccessRemoteResource(permission, 1, 'node-b', 'domain', 'domain.read', 'read', shares)).toBe(true);
    });

    test('no shares at all -> always denied, regardless of grants', async() => {
        const permission = new PermissionService(createSource({
            userGroups: {1: ['ug1']},
            groupAssignments: {ug1: [nodeGroupGrant('r1', 'g1')]},
            rolePermissions: {r1: ['*']}
        }));

        expect(await canAccessRemoteResource(permission, 1, 'node-b', 'domain', 'domain.read', 'read', [])).toBe(false);
    });
});

describe('nodeStillSharesResource', () => {
    test('true when the node has a live share for that resource type, regardless of the group or level', () => {
        expect(nodeStillSharesResource(shares, 'node-b', 'domain')).toBe(true);
    });

    test('false for a resource type the node does not share', () => {
        expect(nodeStillSharesResource(shares, 'node-b', 'route')).toBe(false);
    });

    test('false for a node with no shares at all', () => {
        expect(nodeStillSharesResource(shares, 'node-z', 'domain')).toBe(false);
    });

    test('false against an empty share list', () => {
        expect(nodeStillSharesResource([], 'node-b', 'domain')).toBe(false);
    });

    test('write requirement: a write-level share satisfies it', () => {
        expect(nodeStillSharesResource(shares, 'node-b', 'domain', 'write')).toBe(true);
    });

    test('write requirement: a read-only share does NOT satisfy it (must not authorize a mutation)', () => {
        const readOnlyShares: ClusterShareLike[] = [
            {nodeUid: 'node-d', groupUuid: 'g1', resourceType: 'domain', level: 'read'}
        ];

        expect(nodeStillSharesResource(readOnlyShares, 'node-d', 'domain', 'write')).toBe(false);
        expect(nodeStillSharesResource(readOnlyShares, 'node-d', 'domain', 'read')).toBe(true);
    });
});
