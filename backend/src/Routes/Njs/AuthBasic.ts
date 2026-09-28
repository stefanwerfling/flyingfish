import {Response, Router} from 'express';
import {DefaultRoute, Logger} from '@stefanwerfling/figtree';
import {DefaultHandlerReturn, HandlerResultType} from 'figtree-schemas';
import {BasicAuthParser} from 'flyingfish_core';
import {Credential} from '../../inc/Credential/Credential.js';
import {FlyingFishConfig} from '../../Application/Config/FlyingFishConfig.js';

/**
 * AuthBasic
 */
export class AuthBasic extends DefaultRoute {

    /**
     * check
     * @param response
     * @param location_id
     * @param authHeader
     * @param secret
     */
    public async check(
        response: Response,
        location_id: string,
        authHeader: string,
        secret: string
    ): Promise<boolean> {
        // Shared-secret gate (nginx-native): see AddressAccess::access. Reject control
        // calls that do not carry the configured FLYINGFISH_NGINX_SECRET; skip when unset.
        const expectedSecret = FlyingFishConfig.getInstance().get()?.nginx?.secret ?? '';

        if (expectedSecret !== '' && secret !== expectedSecret) {
            Logger.getLogger().warn('AuthBasic::check: rejected — missing/invalid control secret');
            response.status(403).send();

            return false;
        }

        Logger.getLogger().info('check -> location_id: %s authheader:', location_id, authHeader);

        const auth = BasicAuthParser.parse(authHeader);

        if (auth) {
            let resulte = false;

            switch (auth.scheme) {
                case 'Basic':
                    resulte = await Credential.authBasic(location_id, {
                        username: auth.username,
                        password: auth.password
                    });
                    break;

                case 'Digest':
                    Logger.getLogger().error('Wrong Auth, digest not support in basic auth!');
                    break;
            }

            Logger.getLogger().info('check -> scheme: %s, username: %s, password: *****', auth.scheme, auth.username);

            if (resulte) {
                response.status(200).send();
                return true;
            }
        } else {
            Logger.getLogger().error('check -> auth parse faild');
        }

        response.status(500).send();
        return false;
    }

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        // nginx auth_request subrequest: no user-login gate (this IS the basic-auth
        // check), and `check` sends the empty 200/500 response itself.
        this._get(
            '/njs/auth_basic',
            false,
            async(req, res): Promise<DefaultHandlerReturn> => {
                await this.check(
                    res,
                    req.header('location_id') ?? '',
                    req.header('authheader') ?? '',
                    req.header('secret') ?? ''
                );

                return {type: HandlerResultType.handled};
            },
            {
                description: 'nginx basic-auth check for a location'
            }
        );

        return super.getExpressRouter();
    }

}