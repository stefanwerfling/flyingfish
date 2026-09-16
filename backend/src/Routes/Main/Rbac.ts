import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {
    RbacGroupDB,
    RbacGroupServiceDB,
    RbacPermissionDB,
    RbacPermissionServiceDB,
    RbacRoleAssignmentDB,
    RbacRoleAssignmentServiceDB,
    RbacRoleDB,
    RbacRolePermissionDB,
    RbacRolePermissionServiceDB,
    RbacRoleServiceDB,
    RbacUserGroupDB,
    RbacUserGroupServiceDB
} from 'flyingfish_core';
import {
    DefaultReturn,
    RbacOverviewResponse,
    SchemaDefaultReturn,
    SchemaRbacAssignmentEntry,
    SchemaRbacGroupEntry,
    SchemaRbacIdRequest,
    SchemaRbacMembershipEntry,
    SchemaRbacOverviewResponse,
    SchemaRbacPermissionEntry,
    SchemaRbacRoleEntry,
    SchemaRbacRolePermissionEntry,
    StatusCodes
} from 'flyingfish_schemas';
import {requirePermission} from '../../Application/Server/FlyingFishRouteCheckPermission.js';

/**
 * Rbac — the RBAC management API (epic 9.5.13, slice 4): CRUD over groups, roles,
 * permissions, role↔permission bindings, group↔role grants (scoped) and user↔group
 * memberships, plus a single overview read for the management UI. Every endpoint
 * requires the `rbac.manage` permission (the seeded superadmin holds `*`).
 */
export class Rbac extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/rbac/overview',
            requirePermission('rbac.manage'),
            async(): Promise<RbacOverviewResponse> => {
                return {
                    statusCode: StatusCodes.OK,
                    groups: (await RbacGroupServiceDB.getInstance().findAll()).map((entry) => ({
                        id: entry.id, name: entry.name, description: entry.description, disable: entry.disable
                    })),
                    roles: (await RbacRoleServiceDB.getInstance().findAll()).map((entry) => ({
                        id: entry.id, name: entry.name, description: entry.description
                    })),
                    permissions: (await RbacPermissionServiceDB.getInstance().findAll()).map((entry) => ({
                        id: entry.id, permission_key: entry.permission_key, description: entry.description
                    })),
                    assignments: (await RbacRoleAssignmentServiceDB.getInstance().findAll()).map((entry) => ({
                        id: entry.id, group_id: entry.group_id, role_id: entry.role_id,
                        resource_type: entry.resource_type, resource_id: entry.resource_id
                    })),
                    memberships: (await RbacUserGroupServiceDB.getInstance().findAll()).map((entry) => ({
                        id: entry.id, user_id: entry.user_id, group_id: entry.group_id
                    })),
                    rolePermissions: (await RbacRolePermissionServiceDB.getInstance().findAll()).map((entry) => ({
                        id: entry.id, role_id: entry.role_id, permission_id: entry.permission_id
                    }))
                };
            },
            {
                description: 'Read the whole RBAC model for management',
                responseBodySchema: SchemaRbacOverviewResponse
            }
        );

        this._post('/json/rbac/group/save', requirePermission('rbac.manage'), async(_req, _res, data): Promise<DefaultReturn> => {
            const body = data.body!;
            const entity = body.id === 0 ? new RbacGroupDB() : await RbacGroupServiceDB.getInstance().findOne(body.id) ?? new RbacGroupDB();
            entity.name = body.name;
            entity.description = body.description ?? '';
            entity.disable = body.disable ?? false;
            await RbacGroupServiceDB.getInstance().save(entity);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Create/update a group', bodySchema: SchemaRbacGroupEntry, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/rbac/role/save', requirePermission('rbac.manage'), async(_req, _res, data): Promise<DefaultReturn> => {
            const body = data.body!;
            const entity = body.id === 0 ? new RbacRoleDB() : await RbacRoleServiceDB.getInstance().findOne(body.id) ?? new RbacRoleDB();
            entity.name = body.name;
            entity.description = body.description ?? '';
            await RbacRoleServiceDB.getInstance().save(entity);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Create/update a role', bodySchema: SchemaRbacRoleEntry, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/rbac/permission/save', requirePermission('rbac.manage'), async(_req, _res, data): Promise<DefaultReturn> => {
            const body = data.body!;
            const entity = body.id === 0 ? new RbacPermissionDB() : await RbacPermissionServiceDB.getInstance().findOne(body.id) ?? new RbacPermissionDB();
            entity.permission_key = body.permission_key;
            entity.description = body.description ?? '';
            await RbacPermissionServiceDB.getInstance().save(entity);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Create/update a permission', bodySchema: SchemaRbacPermissionEntry, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/rbac/assignment/save', requirePermission('rbac.manage'), async(_req, _res, data): Promise<DefaultReturn> => {
            const body = data.body!;
            const entity = body.id === 0 ? new RbacRoleAssignmentDB() : await RbacRoleAssignmentServiceDB.getInstance().findOne(body.id) ?? new RbacRoleAssignmentDB();
            entity.group_id = body.group_id;
            entity.role_id = body.role_id;
            entity.resource_type = body.resource_type ?? '';
            entity.resource_id = body.resource_id ?? 0;
            await RbacRoleAssignmentServiceDB.getInstance().save(entity);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Grant a role to a group (optionally resource-scoped)', bodySchema: SchemaRbacAssignmentEntry, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/rbac/membership/save', requirePermission('rbac.manage'), async(_req, _res, data): Promise<DefaultReturn> => {
            const body = data.body!;
            const entity = body.id === 0 ? new RbacUserGroupDB() : await RbacUserGroupServiceDB.getInstance().findOne(body.id) ?? new RbacUserGroupDB();
            entity.user_id = body.user_id;
            entity.group_id = body.group_id;
            await RbacUserGroupServiceDB.getInstance().save(entity);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Add a user to a group', bodySchema: SchemaRbacMembershipEntry, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/rbac/rolepermission/save', requirePermission('rbac.manage'), async(_req, _res, data): Promise<DefaultReturn> => {
            const body = data.body!;
            const entity = body.id === 0 ? new RbacRolePermissionDB() : await RbacRolePermissionServiceDB.getInstance().findOne(body.id) ?? new RbacRolePermissionDB();
            entity.role_id = body.role_id;
            entity.permission_id = body.permission_id;
            await RbacRolePermissionServiceDB.getInstance().save(entity);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Bind a permission to a role', bodySchema: SchemaRbacRolePermissionEntry, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/rbac/group/delete', requirePermission('rbac.manage'), async(_req, _res, data): Promise<DefaultReturn> => {
            await RbacGroupServiceDB.getInstance().remove(data.body!.id);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Delete a group', bodySchema: SchemaRbacIdRequest, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/rbac/role/delete', requirePermission('rbac.manage'), async(_req, _res, data): Promise<DefaultReturn> => {
            await RbacRoleServiceDB.getInstance().remove(data.body!.id);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Delete a role', bodySchema: SchemaRbacIdRequest, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/rbac/permission/delete', requirePermission('rbac.manage'), async(_req, _res, data): Promise<DefaultReturn> => {
            await RbacPermissionServiceDB.getInstance().remove(data.body!.id);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Delete a permission', bodySchema: SchemaRbacIdRequest, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/rbac/assignment/delete', requirePermission('rbac.manage'), async(_req, _res, data): Promise<DefaultReturn> => {
            await RbacRoleAssignmentServiceDB.getInstance().remove(data.body!.id);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Delete a role grant', bodySchema: SchemaRbacIdRequest, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/rbac/membership/delete', requirePermission('rbac.manage'), async(_req, _res, data): Promise<DefaultReturn> => {
            await RbacUserGroupServiceDB.getInstance().remove(data.body!.id);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Remove a user from a group', bodySchema: SchemaRbacIdRequest, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/rbac/rolepermission/delete', requirePermission('rbac.manage'), async(_req, _res, data): Promise<DefaultReturn> => {
            await RbacRolePermissionServiceDB.getInstance().remove(data.body!.id);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Unbind a permission from a role', bodySchema: SchemaRbacIdRequest, responseBodySchema: SchemaDefaultReturn});

        return super.getExpressRouter();
    }

}