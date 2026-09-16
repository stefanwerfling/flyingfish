/**
 * A resource a permission can be scoped to (RBAC epic 9.5.13): a type (e.g. `domain`)
 * and its id. A grant with an empty resource type is global (applies to everything).
 */
export type RbacResource = {
    type: string;
    id: number;
};

/**
 * A role granted to (one of the user's) groups, with its scope. `resourceType` empty
 * (and `resourceId` 0) means a global grant.
 */
export type RbacAssignment = {
    roleId: number;
    resourceType: string;
    resourceId: number;
};

/**
 * The data the permission check needs, injected so the service is testable without a
 * database (the production implementation reads the rbac_* tables).
 */
export interface IRbacDataSource {

    /**
     * The ids of the groups a user belongs to.
     * @param userId - the user id
     */
    groupIdsForUser(userId: number): Promise<number[]>;

    /**
     * The role grants (with scope) of the given groups.
     * @param groupIds - the group ids
     */
    assignmentsForGroups(groupIds: number[]): Promise<RbacAssignment[]>;

    /**
     * The permission keys held by the given roles.
     * @param roleIds - the role ids
     */
    permissionKeysForRoles(roleIds: number[]): Promise<string[]>;
}

/**
 * The wildcard permission key held by the superadmin role — it satisfies any check.
 */
export const RBAC_PERMISSION_WILDCARD = '*';

/**
 * Resolves whether a user holds a permission (RBAC epic 9.5.13). A user's rights come
 * only through group membership: user → groups → role grants → roles → permissions.
 * A grant is either GLOBAL (empty resource type — applies to every check, this is how
 * superadmin works) or scoped to one resource (e.g. a `domain` id — applies only when
 * the check is for that exact resource). The `*` wildcard permission satisfies any
 * check. Pure logic over an injected {@link IRbacDataSource}.
 */
export class PermissionService {

    private readonly _source: IRbacDataSource;

    /**
     * @param source - the RBAC data source
     */
    public constructor(source: IRbacDataSource) {
        this._source = source;
    }

    /**
     * Whether the user may perform `permission`, optionally on a specific resource. A
     * global grant covers any resource; a resource-scoped grant applies only to the
     * given resource (and never to an unscoped check).
     * @param userId - the acting user
     * @param permission - the permission key required (e.g. `domain.write`)
     * @param resource - the resource the action targets, if any
     */
    public async can(userId: number, permission: string, resource?: RbacResource): Promise<boolean> {
        const groupIds = await this._source.groupIdsForUser(userId);

        if (groupIds.length === 0) {
            return false;
        }

        const assignments = await this._source.assignmentsForGroups(groupIds);
        const roleIds = new Set<number>();

        for (const assignment of assignments) {
            if (PermissionService._applies(assignment, resource)) {
                roleIds.add(assignment.roleId);
            }
        }

        if (roleIds.size === 0) {
            return false;
        }

        const keys = new Set(await this._source.permissionKeysForRoles(Array.from(roleIds)));

        return keys.has(RBAC_PERMISSION_WILDCARD) || keys.has(permission);
    }

    /**
     * Whether a grant applies to the current check: a global grant always does; a
     * scoped grant only when the check targets that exact resource.
     * @param assignment - the role grant
     * @param resource - the resource the check targets, if any
     */
    private static _applies(assignment: RbacAssignment, resource?: RbacResource): boolean {
        if (assignment.resourceType === '') {
            return true;
        }

        return resource !== undefined &&
            assignment.resourceType === resource.type &&
            assignment.resourceId === resource.id;
    }

}