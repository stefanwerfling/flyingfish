/**
 * Unit tests for the RBAC permission service (epic 9.5.13): a user's rights come only
 * through group membership (user → groups → role grants → roles → permissions).
 * Covers the superadmin wildcard, no-groups deny, a global role's exact permission,
 * per-resource scoping (a grant on domain 5 does not cover domain 6 or an unscoped
 * check), and that a global grant covers a resource-scoped check. Driven by a fake
 * data source — network-free.
 */
import {IRbacDataSource, PermissionService, RbacAssignment} from 'flyingfish_core';

/**
 * Build a fake IRbacDataSource from a small in-memory model.
 * @param model - groups per user, assignments per group, permissions per role
 */
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

// Group/role ids are cluster-stable UUIDs (strings); resource ids stay node-local ints,
// except UUID-keyed resource types (e.g. node-group), which use resourceUuid instead.
const globalGrant = (roleId: string): RbacAssignment => ({roleId: roleId, resourceType: '', resourceId: 0, resourceUuid: ''});
const domainGrant = (roleId: string, domainId: number): RbacAssignment =>
    ({roleId: roleId, resourceType: 'domain', resourceId: domainId, resourceUuid: ''});
const nodeGroupGrant = (roleId: string, groupUuid: string): RbacAssignment =>
    ({roleId: roleId, resourceType: 'node-group', resourceId: 0, resourceUuid: groupUuid});

describe('PermissionService.can', () => {
    test('superadmin: a global role with the * wildcard satisfies any check', async() => {
        const service = new PermissionService(createSource({
            userGroups: {1: ['10']},
            groupAssignments: {10: [globalGrant('100')]},
            rolePermissions: {100: ['*']}
        }));

        expect(await service.can(1, 'domain.write')).toBe(true);
        expect(await service.can(1, 'anything.at.all', {type: 'domain', id: 5})).toBe(true);
    });

    test('a user in no groups is denied', async() => {
        const service = new PermissionService(createSource({userGroups: {}, groupAssignments: {}, rolePermissions: {}}));

        expect(await service.can(1, 'domain.read')).toBe(false);
    });

    test('a global role grants exactly its permissions', async() => {
        const service = new PermissionService(createSource({
            userGroups: {1: ['10']},
            groupAssignments: {10: [globalGrant('100')]},
            rolePermissions: {100: ['domain.read']}
        }));

        expect(await service.can(1, 'domain.read')).toBe(true);
        expect(await service.can(1, 'domain.write')).toBe(false);
    });

    test('a resource-scoped grant applies only to that resource, not others or unscoped checks', async() => {
        const service = new PermissionService(createSource({
            userGroups: {1: ['10']},
            groupAssignments: {10: [domainGrant('200', 5)]},
            rolePermissions: {200: ['domain.write']}
        }));

        expect(await service.can(1, 'domain.write', {type: 'domain', id: 5})).toBe(true);
        expect(await service.can(1, 'domain.write', {type: 'domain', id: 6})).toBe(false);
        expect(await service.can(1, 'domain.write')).toBe(false);
    });

    test('a global grant also covers a resource-scoped check', async() => {
        const service = new PermissionService(createSource({
            userGroups: {1: ['10']},
            groupAssignments: {10: [globalGrant('100')]},
            rolePermissions: {100: ['domain.write']}
        }));

        expect(await service.can(1, 'domain.write', {type: 'domain', id: 42})).toBe(true);
    });

    test('rights accumulate across a user\'s groups', async() => {
        const service = new PermissionService(createSource({
            userGroups: {1: ['10', '11']},
            groupAssignments: {10: [globalGrant('100')], 11: [domainGrant('200', 7)]},
            rolePermissions: {100: ['domain.read'], 200: ['domain.write']}
        }));

        expect(await service.can(1, 'domain.read')).toBe(true);
        expect(await service.can(1, 'domain.write', {type: 'domain', id: 7})).toBe(true);
        expect(await service.can(1, 'domain.write', {type: 'domain', id: 8})).toBe(false);
    });

    test('a UUID-scoped grant (node-group, Cluster/Mesh 9.5.12.4) applies only to that group, never to an int-scoped check', async() => {
        const service = new PermissionService(createSource({
            userGroups: {1: ['10']},
            groupAssignments: {10: [nodeGroupGrant('300', 'ng-1')]},
            rolePermissions: {300: ['domain.write']}
        }));

        expect(await service.can(1, 'domain.write', {type: 'node-group', uuid: 'ng-1'})).toBe(true);
        expect(await service.can(1, 'domain.write', {type: 'node-group', uuid: 'ng-2'})).toBe(false);
        // a uuid-scoped grant never accidentally matches an id-scoped check on the same type name
        expect(await service.can(1, 'domain.write', {type: 'node-group', id: 0})).toBe(false);
        expect(await service.can(1, 'domain.write')).toBe(false);
    });
});