import {Request, Response, Router} from 'express';
import {Logger} from 'figtree';
import {BasicAuthParser, DefaultRoute} from 'flyingfish_core';
import {Credential} from '../../inc/Credential/Credential.js';

/**
 * AuthBasic
 *
 * njs `auth_basic` control route, hosted here so it runs in the same
 * container as nginx — mirrors the backend's local-mode route
 * (backend/src/Routes/Njs/AuthBasic.ts). See Credential for the reduced
 * (database-provider-only) credential check available in this container.
 */
export class AuthBasic extends DefaultRoute {

    /**
     * check
     * @param response
     * @param location_id
     * @param authHeader
     */
    public async check(
        response: Response,
        location_id: string,
        authHeader: string
    ): Promise<boolean> {
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
        // nginx auth_request subrequest: `check` sends the empty 200/500
        // response itself, so the handler stays void.
        this._get(
            '/njs/auth_basic',
            async(req: Request, res: Response): Promise<void> => {
                await this.check(
                    res,
                    req.header('location_id') ?? '',
                    req.header('authheader') ?? ''
                );
            }
        );

        return super.getExpressRouter();
    }

}