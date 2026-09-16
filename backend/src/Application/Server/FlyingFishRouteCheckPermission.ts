import {Request, Response} from 'express';
import {DefaultRouteCheckUserLogin} from '@stefanwerfling/figtree';
import {RbacResource} from 'flyingfish_core';
import {DefaultReturn, SchemaRequestData, StatusCodes} from 'flyingfish_schemas';
import {FlyingFishPermissions} from './FlyingFishPermissions.js';

/**
 * Deny with the frontend's 200 + UNAUTHORIZED contract.
 * @param response - the response
 */
const denyUnauthorized = (response: Response): boolean => {
    response.status(200).json({statusCode: StatusCodes.UNAUTHORIZED} as DefaultReturn);

    return false;
};

/**
 * A route guard (RBAC epic 9.5.13) shaped like {@link FlyingFishRouteCheckUserLogin} —
 * usable directly in `_get`/`_post`'s checkUserLogin slot — that requires the logged-in
 * user to hold `permission` (globally). Because the seeded Administrators group has the
 * `*` wildcard, existing admins pass; a user without the right gets 200 + UNAUTHORIZED.
 * @param permission - the required permission key (e.g. `user.manage`)
 */
export const requirePermission = (permission: string): DefaultRouteCheckUserLogin =>
    async(request: Request, response: Response): Promise<boolean> => {
        if (!SchemaRequestData.validate(request, []) || request.session.user?.isLogin !== true) {
            return denyUnauthorized(response);
        }

        if (await FlyingFishPermissions.getInstance().can(request.session.user.userid, permission)) {
            return true;
        }

        return denyUnauthorized(response);
    };

/**
 * Whether the logged-in user of a request holds a permission on a specific resource
 * (RBAC epic 9.5.13) — for in-handler, resource-scoped checks (e.g. write on domain
 * <id>). Returns false (without sending a response) when not logged in or not allowed,
 * so the caller decides how to answer.
 * @param request - the request
 * @param permission - the required permission key
 * @param resource - the target resource
 */
export const hasPermissionOnResource = async(
    request: Request,
    permission: string,
    resource: RbacResource
): Promise<boolean> => {
    if (!SchemaRequestData.validate(request, []) || request.session.user?.isLogin !== true) {
        return false;
    }

    return FlyingFishPermissions.getInstance().can(request.session.user.userid, permission, resource);
};