import {Response, Router} from 'express';
import {DefaultRoute, Logger} from 'flyingfish_core';
import {Credential} from '../../inc/Credential/Credential.js';
import {BasicAuthParser} from '../../inc/Server/BasicAuthParser.js';

/**
 * AuthBasic
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
    public getExpressRouter(): Router {
        this._get(
            '/njs/auth_basic',
            async(req, res) => {
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