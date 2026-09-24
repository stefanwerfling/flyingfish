import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../Core/Server/Routes/DefaultReturn.js';

/**
 * RBAC management DTOs (epic 9.5.13, slice 4). On a save an EMPTY id creates,
 * otherwise updates: the POLICY entities (group/role/permission/assignment/
 * rolePermission) are cluster-global and keyed by a UUID string, so their create
 * sentinel is the empty string `''`; the node-local membership keeps its int id and a
 * `0` create sentinel. All management endpoints are gated by the `rbac.manage`
 * permission.
 */

/**
 * A group (cluster-global policy — UUID id).
 */
export const SchemaRbacGroupEntry = Vts.object({
    id: Vts.string(),
    name: Vts.string(),
    description: Vts.optional(Vts.string()),
    disable: Vts.optional(Vts.boolean())
});

/**
 * RbacGroupEntry
 */
export type RbacGroupEntry = ExtractSchemaResultType<typeof SchemaRbacGroupEntry>;

/**
 * A role (cluster-global policy — UUID id).
 */
export const SchemaRbacRoleEntry = Vts.object({
    id: Vts.string(),
    name: Vts.string(),
    description: Vts.optional(Vts.string())
});

/**
 * RbacRoleEntry
 */
export type RbacRoleEntry = ExtractSchemaResultType<typeof SchemaRbacRoleEntry>;

/**
 * A permission (cluster-global policy — UUID id).
 */
export const SchemaRbacPermissionEntry = Vts.object({
    id: Vts.string(),
    permission_key: Vts.string(),
    description: Vts.optional(Vts.string())
});

/**
 * RbacPermissionEntry
 */
export type RbacPermissionEntry = ExtractSchemaResultType<typeof SchemaRbacPermissionEntry>;

/**
 * A role grant to a group, optionally scoped to a resource (cluster-global policy —
 * UUID id/group_id/role_id). `resource_id` (node-local int, e.g. a `domain`) and
 * `resource_uuid` (cluster-stable UUID, e.g. a `node-group`, 9.5.12.4) are mutually
 * exclusive — which one is meaningful depends on `resource_type`.
 */
export const SchemaRbacAssignmentEntry = Vts.object({
    id: Vts.string(),
    group_id: Vts.string(),
    role_id: Vts.string(),
    resource_type: Vts.optional(Vts.string()),
    resource_id: Vts.optional(Vts.number()),
    resource_uuid: Vts.optional(Vts.string())
});

/**
 * RbacAssignmentEntry
 */
export type RbacAssignmentEntry = ExtractSchemaResultType<typeof SchemaRbacAssignmentEntry>;

/**
 * A user↔group membership (node-local — int id + int user_id; group_id is the
 * cluster-global group's UUID).
 */
export const SchemaRbacMembershipEntry = Vts.object({
    id: Vts.number(),
    user_id: Vts.number(),
    group_id: Vts.string()
});

/**
 * RbacMembershipEntry
 */
export type RbacMembershipEntry = ExtractSchemaResultType<typeof SchemaRbacMembershipEntry>;

/**
 * A role↔permission binding (cluster-global policy — UUID id/role_id/permission_id).
 */
export const SchemaRbacRolePermissionEntry = Vts.object({
    id: Vts.string(),
    role_id: Vts.string(),
    permission_id: Vts.string()
});

/**
 * RbacRolePermissionEntry
 */
export type RbacRolePermissionEntry = ExtractSchemaResultType<typeof SchemaRbacRolePermissionEntry>;

/**
 * A UUID-id request — deletes a cluster-global policy entity (group/role/permission/
 * assignment/rolePermission).
 */
export const SchemaRbacIdRequest = Vts.object({
    id: Vts.string()
});

/**
 * RbacIdRequest
 */
export type RbacIdRequest = ExtractSchemaResultType<typeof SchemaRbacIdRequest>;

/**
 * An int-id request — deletes a node-local membership (rbac_user_group).
 */
export const SchemaRbacMembershipIdRequest = Vts.object({
    id: Vts.number()
});

/**
 * RbacMembershipIdRequest
 */
export type RbacMembershipIdRequest = ExtractSchemaResultType<typeof SchemaRbacMembershipIdRequest>;

/**
 * The whole RBAC picture for the management UI.
 */
export const SchemaRbacOverviewResponse = SchemaDefaultReturn.extend({
    groups: Vts.array(SchemaRbacGroupEntry),
    roles: Vts.array(SchemaRbacRoleEntry),
    permissions: Vts.array(SchemaRbacPermissionEntry),
    assignments: Vts.array(SchemaRbacAssignmentEntry),
    memberships: Vts.array(SchemaRbacMembershipEntry),
    rolePermissions: Vts.array(SchemaRbacRolePermissionEntry)
});

/**
 * RbacOverviewResponse
 */
export type RbacOverviewResponse = ExtractSchemaResultType<typeof SchemaRbacOverviewResponse>;