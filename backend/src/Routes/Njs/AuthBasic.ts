import {Response} from 'express';
import {Get, HeaderParam, JsonController, Res} from 'routing-controllers';
import {Credential} from '../../inc/Credential/Credential';
import {Logger} from '../../inc/Logger/Logger';
import {BasicAuthParser} from '../../inc/Server/BasicAuthParser';

/**
 * AuthBasic
 */
@JsonController()
export class AuthBasic {

    /**
     * check
     * @param response
     * @param location_id
     * @param authHeader
     */
    @Get('/njs/auth_basic')
    public async check(
        @Res() response: Response,
        @HeaderParam('location_id') location_id: string,
        @HeaderParam('authheader') authHeader: string
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

}