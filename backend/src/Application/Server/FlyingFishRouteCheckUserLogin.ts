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

/**
 * isFlyingFishUserLogin
 *
 * Pure predicate variant of the login check (no response is sent). Mirrors the
 * former core `DefaultRoute.isUserLogin(req, res, false)`: it only reports
 * whether a logged-in user is present. Used by routes that answer 200 either way
 * and branch on the login state inside the handler (e.g. the dashboard and the
 * /json/islogin probe) instead of gating with FlyingFishRouteCheckUserLogin.
 */
export const isFlyingFishUserLogin = (request: Request): boolean => {
    if (SchemaRequestData.validate(request, [])) {
        return request.session.user?.isLogin === true;
    }

    return false;
};