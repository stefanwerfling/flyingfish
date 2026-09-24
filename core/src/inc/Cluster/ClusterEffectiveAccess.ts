import {ClusterNodeGroupView} from './ClusterNodeGroupAggregate.js';
import {ClusterRbacView} from './ClusterRbacAggregate.js';

/**
 * One combined "what does this actually grant" row (Cluster/Mesh epic 9.5.12.5): a node's
 * sharing rule crossed with an RBAC grant scoped to the same node group. A node group is
 * the boundary a share exposes a resource type across (9.5.12.4 part 1); an RBAC grant
 * scoped to `resource_type: 'node-group'` + that group's uuid then says which role — and
 * therefore which permission keys — applies inside it (9.5.12.4 part 2). This is the
 * join of the two: for every live share, every role granted on its group.
 */
export type ClusterEffectiveAccessEntry = {
    nodeUid: string;
    resourceType: string;
    level: string;
    groupUuid: string;
    groupName: string;
    roleId: string;
    roleName: string;
    permissionKeys: string[];
};

/**
 * Compute the effective-access preview (Cluster/Mesh epic 9.5.12.5): for every node-group
 * sharing rule, every RBAC role granted on that same group (resource_type `node-group`,
 * resource_uuid the group's id), resolved to the role's permission keys. A share with no
 * matching grant yields nothing — default-deny holds even once a resource type is shared,
 * until a role is actually granted on the group. Pure/data-level, no I/O.
 * @param nodeGroups - the aggregated node-group view (groups + shares)
 * @param rbac - the aggregated RBAC policy view (assignments + roles + permissions)
 */
export const computeClusterEffectiveAccess = (nodeGroups: ClusterNodeGroupView, rbac: ClusterRbacView): ClusterEffectiveAccessEntry[] => {
    const groupNameById = new Map(nodeGroups.groups.map((group) => [group.id, group.name]));
    const roleNameById = new Map(rbac.roles.map((role) => [role.id, role.name]));
    const permissionKeyById = new Map(rbac.permissions.map((permission) => [permission.id, permission.permission_key]));

    const permissionKeysByRole = new Map<string, string[]>();

    for (const rolePermission of rbac.rolePermissions) {
        const key = permissionKeyById.get(rolePermission.permission_id);

        if (key === undefined) {
            continue;
        }

        const keys = permissionKeysByRole.get(rolePermission.role_id) ?? [];
        keys.push(key);
        permissionKeysByRole.set(rolePermission.role_id, keys);
    }

    const result: ClusterEffectiveAccessEntry[] = [];

    for (const share of nodeGroups.shares) {
        const scopedAssignments = rbac.assignments.filter(
            (assignment) => assignment.resource_type === 'node-group' && assignment.resource_uuid === share.groupUuid
        );

        for (const assignment of scopedAssignments) {
            result.push({
                nodeUid: share.nodeUid,
                resourceType: share.resourceType,
                level: share.level,
                groupUuid: share.groupUuid,
                groupName: groupNameById.get(share.groupUuid) ?? '',
                roleId: assignment.role_id,
                roleName: roleNameById.get(assignment.role_id) ?? '',
                permissionKeys: (permissionKeysByRole.get(assignment.role_id) ?? []).slice().sort()
            });
        }
    }

    result.sort((a, b) =>
        a.nodeUid.localeCompare(b.nodeUid) ||
        a.resourceType.localeCompare(b.resourceType) ||
        a.roleName.localeCompare(b.roleName)
    );

    return result;
};
