import {ClusterGossipStateEntry} from './HubClusterGossipSync.js';

/**
 * The cluster-global RBAC POLICY, aggregated from the gossip (Cluster/Mesh epic
 * 9.5.12, A+C shared rights DB). Each table is published under a GLOBAL, cluster-stable
 * UUID key (no per-node namespace), so this is one shared policy set — not a per-node
 * federation. `rbac_user_group` is deliberately absent (node-local, not gossiped).
 */
export type ClusterRbacGroup = {id: string; name: string; description: string; disable: boolean;};
export type ClusterRbacRole = {id: string; name: string; description: string;};
export type ClusterRbacPermission = {id: string; permission_key: string; description: string;};
export type ClusterRbacRolePermission = {id: string; role_id: string; permission_id: string;};
export type ClusterRbacAssignment = {
    id: string;
    group_id: string;
    role_id: string;
    resource_type: string;
    resource_id: number;
    resource_uuid: string;
};

/**
 * Ids tombstoned (deleted) somewhere in the cluster since the local DB last converged
 * (Cluster/Mesh epic 9.5.12.8 fix) — mirrors {@link ClusterNodeGroupTombstones}.
 */
export type ClusterRbacTombstones = {
    groupIds: string[];
    roleIds: string[];
    permissionIds: string[];
    rolePermissionIds: string[];
    assignmentIds: string[];
};

/**
 * The whole cluster-wide RBAC policy view.
 */
export type ClusterRbacView = {
    groups: ClusterRbacGroup[];
    roles: ClusterRbacRole[];
    permissions: ClusterRbacPermission[];
    rolePermissions: ClusterRbacRolePermission[];
    assignments: ClusterRbacAssignment[];
    tombstones: ClusterRbacTombstones;
};

/**
 * The gossip key prefixes of each published RBAC policy table. `rbac_role:` does not
 * clash with `rbac_role_permission:`/`rbac_role_assignment:` — the trailing colon
 * bounds the match.
 */
const KEY_GROUP = 'rbac_group:';
const KEY_ROLE = 'rbac_role:';
const KEY_PERMISSION = 'rbac_permission:';
const KEY_ROLE_PERMISSION = 'rbac_role_permission:';
const KEY_ROLE_ASSIGNMENT = 'rbac_role_assignment:';

/**
 * Coerce an unknown to a string, defaulting to empty.
 * @param value - the value
 */
const toStr = (value: unknown): string => typeof value === 'string' ? value : '';

/**
 * Coerce an unknown to a finite number, defaulting to 0.
 * @param value - the value
 */
const toNum = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? value : 0;

/**
 * Aggregate the gossip into the cluster-wide RBAC policy view (Cluster/Mesh epic
 * 9.5.12, A+C): collect every global `rbac_*:<uuid>` entry into its table. Because the
 * keys are cluster-global UUIDs (published un-namespaced), each logical policy row
 * appears once regardless of which node published it — this is the shared rights DB an
 * enforcing node reads. Per-node entries (`<nodeUid>/domain:*`, `node:*`, `hub`) and
 * malformed values are ignored. Each table is ordered by id for a stable listing.
 * @param entries - the cluster-wide aggregate entries
 */
export const aggregateClusterRbac = (entries: readonly ClusterGossipStateEntry[]): ClusterRbacView => {
    const view: ClusterRbacView = {
        groups: [], roles: [], permissions: [], rolePermissions: [], assignments: [],
        tombstones: {groupIds: [], roleIds: [], permissionIds: [], rolePermissionIds: [], assignmentIds: []}
    };

    for (const entry of entries) {
        // A tombstone carries no value (see ClusterGossipStore.remove) — its id lives
        // only in the key, which every prefix here already encodes.
        if (entry.deleted === true) {
            if (entry.key.startsWith(KEY_ROLE_PERMISSION)) {
                view.tombstones.rolePermissionIds.push(entry.key.slice(KEY_ROLE_PERMISSION.length));
            } else if (entry.key.startsWith(KEY_ROLE_ASSIGNMENT)) {
                view.tombstones.assignmentIds.push(entry.key.slice(KEY_ROLE_ASSIGNMENT.length));
            } else if (entry.key.startsWith(KEY_GROUP)) {
                view.tombstones.groupIds.push(entry.key.slice(KEY_GROUP.length));
            } else if (entry.key.startsWith(KEY_ROLE)) {
                view.tombstones.roleIds.push(entry.key.slice(KEY_ROLE.length));
            } else if (entry.key.startsWith(KEY_PERMISSION)) {
                view.tombstones.permissionIds.push(entry.key.slice(KEY_PERMISSION.length));
            }

            continue;
        }

        const value = entry.value;

        if (value === null || typeof value !== 'object') {
            continue;
        }

        const row = value as Record<string, unknown>;

        if (entry.key.startsWith(KEY_ROLE_PERMISSION)) {
            view.rolePermissions.push({id: toStr(row.id), role_id: toStr(row.role_id), permission_id: toStr(row.permission_id)});
        } else if (entry.key.startsWith(KEY_ROLE_ASSIGNMENT)) {
            view.assignments.push({
                id: toStr(row.id),
                group_id: toStr(row.group_id),
                role_id: toStr(row.role_id),
                resource_type: toStr(row.resource_type),
                resource_id: toNum(row.resource_id),
                resource_uuid: toStr(row.resource_uuid)
            });
        } else if (entry.key.startsWith(KEY_GROUP)) {
            view.groups.push({id: toStr(row.id), name: toStr(row.name), description: toStr(row.description), disable: row.disable === true});
        } else if (entry.key.startsWith(KEY_ROLE)) {
            view.roles.push({id: toStr(row.id), name: toStr(row.name), description: toStr(row.description)});
        } else if (entry.key.startsWith(KEY_PERMISSION)) {
            view.permissions.push({id: toStr(row.id), permission_key: toStr(row.permission_key), description: toStr(row.description)});
        }
    }

    view.groups.sort((a, b) => a.id.localeCompare(b.id));
    view.roles.sort((a, b) => a.id.localeCompare(b.id));
    view.permissions.sort((a, b) => a.id.localeCompare(b.id));
    view.rolePermissions.sort((a, b) => a.id.localeCompare(b.id));
    view.assignments.sort((a, b) => a.id.localeCompare(b.id));

    return view;
};