import {Request, Response} from 'express';
import {DefaultRouteCheckUserLogin} from 'figtree';
import {DefaultReturn, SchemaRequestData, StatusCodes} from 'flyingfish_schemas';

/**
 * FlyingFishRouteCheckUserLogin
 *
 * FlyingFish auth guard for figtree's `DefaultRoute`. It is the `checkUserLogin`
 * function handed to `_get`/`_post` and mirrors the former flyingfish_core
 * `DefaultRoute.isUserLogin` one-to-one: validate the request/session shape,
 * require a logged-in user, and on failure answer `200` + `UNAUTHORIZED` (the
 * response contract the frontend relies on) and return `false` so figtree's
 * DefaultRoute skips the handler. FlyingFish has no per-right ACL yet, so the
 * optional `aclRight` argument is ignored.
 */
export const FlyingFishRouteCheckUserLogin: DefaultRouteCheckUserLogin = async(
    request: Request,
    response: Response
): Promise<boolean> => {
    if (SchemaRequestData.validate(request, [])) {
        if (request.session.user?.isLogin) {
            return true;
        }
    }

    response.status(200).json({
        statusCode: StatusCodes.UNAUTHORIZED
    } as DefaultReturn);

    return false;
};