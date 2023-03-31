import {Response, Router} from 'express';
import {Credential} from '../../inc/Credential/Credential.js';
import {Logger} from '../../inc/Logger/Logger.js';
import {DefaultRoute} from '../../inc/Routes/DefaultRoute.js';
import {BasicAuthParser} from '../../inc/Server/BasicAuthParser.js';

/**
 * AuthBasic
 */
export class AuthBasic extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

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
        Logger.getLogger().info(`check -> location_id: ${location_id}`);
        Logger.getLogger().info(`check -> authheader: ${authHeader}`);

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

            Logger.getLogger().info(`check -> scheme: ${auth.scheme}, username: ${auth.username}, password: *****`);

            if (resulte) {
                response.status(200);
                return true;
            }
        } else {
            Logger.getLogger().error('check -> auth parse faild');
        }

        response.status(500);
        return false;
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
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