import {Response} from 'express';
import {Get, HeaderParam, JsonController, Res} from 'routing-controllers';
import {NginxLocation as NginxLocationDB} from '../../inc/Db/MariaDb/Entity/NginxLocation';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
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
        const locationRepository = MariaDbHelper.getRepository(NginxLocationDB);

        const location = await locationRepository.findOne({
            where: {
                id: location_id
            }
        });

        if (location) {
            console.log(`check -> location_id: ${location_id}`);
            console.log(`check -> authheader: ${authHeader}`);

            const auth = BasicAuthParser.parse(authHeader);

            if (auth) {
                console.log(`check -> schema: ${auth.scheme}, username: ${auth.username}, password: ${auth.password}`);

                response.status(200);
                return true;
            } else {
                console.log('check -> auth parse faild');
            }
        } else {
            console.log(`Location not found: ${location_id}`);
        }

        response.status(500);
        return false;
    }

}