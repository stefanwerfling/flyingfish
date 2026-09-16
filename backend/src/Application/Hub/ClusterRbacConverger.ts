import {
    ClusterRbacView,
    RbacGroupServiceDB,
    RbacPermissionServiceDB,
    RbacRoleAssignmentServiceDB,
    RbacRolePermissionServiceDB,
    RbacRoleServiceDB
} from 'flyingfish_core';

/**
 * Converges the cluster-global RBAC POLICY (gossiped, aggregated by
 * {@link aggregateClusterRbac}) into this node's LOCAL rbac_* tables (Cluster/Mesh
 * epic 9.5.12, A+C — option B). Because the policy is keyed by cluster-stable UUIDs,
 * every node can UPSERT the shared rows into its own DB by id, so the local DB becomes
 * a replica of the shared rights DB and LOCAL enforcement (RbacDbDataSource) naturally
 * sees the whole cluster's policy — robust when offline / after a restart, and correct
 * for a single node with no mesh (the aggregate then just carries the node's own rows).
 *
 * UPSERT-ONLY (create + update). DELETE propagation is deliberately out of scope here:
 * the pushed aggregate carries only live entries (no tombstones), so an absent row is
 * indistinguishable from a not-yet-propagated local write — deleting on that basis
 * would be unsafe. Delete/revoke convergence (via tombstone propagation) is a
 * follow-up; until then a revoked policy row is not removed from other nodes.
 *
 * `rbac_user_group` is never converged — it is node-local (binds local users to global
 * groups) and is not part of the shared policy.
 */
export class ClusterRbacConverger {

    /**
     * Upsert the shared policy view into the local rbac_* tables (idempotent, keyed by
     * the cluster-stable UUID id). Empty tables are skipped.
     * @param view - the cluster-wide RBAC policy aggregated from the gossip
     */
    public async import(view: ClusterRbacView): Promise<void> {
        if (view.groups.length > 0) {
            await RbacGroupServiceDB.getInstance().getRepository().upsert(
                view.groups.map((group) => ({id: group.id, name: group.name, description: group.description, disable: group.disable})),
                ['id']
            );
        }

        if (view.roles.length > 0) {
            await RbacRoleServiceDB.getInstance().getRepository().upsert(
                view.roles.map((role) => ({id: role.id, name: role.name, description: role.description})),
                ['id']
            );
        }

        if (view.permissions.length > 0) {
            await RbacPermissionServiceDB.getInstance().getRepository().upsert(
                view.permissions.map((permission) => ({id: permission.id, permission_key: permission.permission_key, description: permission.description})),
                ['id']
            );
        }

        if (view.rolePermissions.length > 0) {
            await RbacRolePermissionServiceDB.getInstance().getRepository().upsert(
                view.rolePermissions.map((rolePermission) => ({id: rolePermission.id, role_id: rolePermission.role_id, permission_id: rolePermission.permission_id})),
                ['id']
            );
        }

        if (view.assignments.length > 0) {
            await RbacRoleAssignmentServiceDB.getInstance().getRepository().upsert(
                view.assignments.map((assignment) => ({
                    id: assignment.id,
                    group_id: assignment.group_id,
                    role_id: assignment.role_id,
                    resource_type: assignment.resource_type,
                    resource_id: assignment.resource_id
                })),
                ['id']
            );
        }
    }

}