import {Request, Response} from 'express';
import {DefaultRouteCheckUserLogin} from 'figtree';
import {ServiceAuth} from '../../inc/Server/ServiceAuth.js';
import {FlyingFishConfig} from '../Config/FlyingFishConfig.js';
import {FlyingFishRouteCheckUserLogin} from './FlyingFishRouteCheckUserLogin.js';

/**
 * Request header a part passes its shared registry secret in.
 */
export const REGISTRY_SECRET_HEADER = 'x-flyingfish-registry-secret';

/**
 * FlyingFishRouteCheckServiceOrUserLogin
 *
 * Auth guard for the part-facing Hub registry endpoints (register/heartbeat/bye).
 * A part authenticates with the shared registry secret via the
 * `x-flyingfish-registry-secret` header, verified in constant time through the
 * ServiceAuth seam (step 5.3, the PKI/mTLS pre-stage). If no valid secret is
 * present it falls back to the normal user-login check, so an admin session in
 * the browser keeps working too. This is the interim transport-less
 * self-registration path until per-service PKI over mTLS-WSS (epic 9.4).
 */
export const FlyingFishRouteCheckServiceOrUserLogin: DefaultRouteCheckUserLogin = async(
    request: Request,
    response: Response
): Promise<boolean> => {
    const provided = request.headers[REGISTRY_SECRET_HEADER];
    const expected = FlyingFishConfig.getInstance().get()?.registry?.secret;

    if (typeof provided === 'string' && expected && ServiceAuth.verifySecret(provided, expected)) {
        return true;
    }

    return FlyingFishRouteCheckUserLogin(request, response);
};