import {Response} from 'express';
import {Get, HeaderParam, JsonController, Res} from 'routing-controllers';
import {Credential} from '../../inc/Credential/Credential';
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
        console.log(`check -> location_id: ${location_id}`);
        console.log(`check -> authheader: ${authHeader}`);

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
                    console.error('Wrong Auth, digest not support in basic auth!');
                    break;
            }


            // console.log(`check -> scheme: ${auth.scheme}, username: ${auth.username}, password: ${auth.password}`);

            if (resulte) {
                response.status(200);
                return true;
            }
        } else {
            console.log('check -> auth parse faild');
        }

        response.status(500);
        return false;
    }

}