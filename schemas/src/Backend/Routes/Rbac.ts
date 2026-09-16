import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../Core/Server/Routes/DefaultReturn.js';

/**
 * RBAC management DTOs (epic 9.5.13, slice 4). id 0 on a save = create; otherwise
 * update. All management endpoints are gated by the `rbac.manage` permission.
 */

/**
 * A group.
 */
export const SchemaRbacGroupEntry = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
    description: Vts.optional(Vts.string()),
    disable: Vts.optional(Vts.boolean())
});

/**
 * RbacGroupEntry
 */
export type RbacGroupEntry = ExtractSchemaResultType<typeof SchemaRbacGroupEntry>;

/**
 * A role.
 */
export const SchemaRbacRoleEntry = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
    description: Vts.optional(Vts.string())
});

/**
 * RbacRoleEntry
 */
export type RbacRoleEntry = ExtractSchemaResultType<typeof SchemaRbacRoleEntry>;

/**
 * A permission.
 */
export const SchemaRbacPermissionEntry = Vts.object({
    id: Vts.number(),
    permission_key: Vts.string(),
    description: Vts.optional(Vts.string())
});

/**
 * RbacPermissionEntry
 */
export type RbacPermissionEntry = ExtractSchemaResultType<typeof SchemaRbacPermissionEntry>;

/**
 * A role grant to a group, optionally scoped to a resource.
 */
export const SchemaRbacAssignmentEntry = Vts.object({
    id: Vts.number(),
    group_id: Vts.number(),
    role_id: Vts.number(),
    resource_type: Vts.optional(Vts.string()),
    resource_id: Vts.optional(Vts.number())
});

/**
 * RbacAssignmentEntry
 */
export type RbacAssignmentEntry = ExtractSchemaResultType<typeof SchemaRbacAssignmentEntry>;

/**
 * A user↔group membership.
 */
export const SchemaRbacMembershipEntry = Vts.object({
    id: Vts.number(),
    user_id: Vts.number(),
    group_id: Vts.number()
});

/**
 * RbacMembershipEntry
 */
export type RbacMembershipEntry = ExtractSchemaResultType<typeof SchemaRbacMembershipEntry>;

/**
 * A role↔permission binding.
 */
export const SchemaRbacRolePermissionEntry = Vts.object({
    id: Vts.number(),
    role_id: Vts.number(),
    permission_id: Vts.number()
});

/**
 * RbacRolePermissionEntry
 */
export type RbacRolePermissionEntry = ExtractSchemaResultType<typeof SchemaRbacRolePermissionEntry>;

/**
 * An id-only request (delete).
 */
export const SchemaRbacIdRequest = Vts.object({
    id: Vts.number()
});

/**
 * RbacIdRequest
 */
export type RbacIdRequest = ExtractSchemaResultType<typeof SchemaRbacIdRequest>;

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
