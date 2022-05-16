import {Response} from 'express';
import {Get, HeaderParam, JsonController, Res} from 'routing-controllers';

@JsonController()
export class AuthBasic {

    @Get('/njs/auth_basic')
    public async check(
        @Res() response: Response,
        @HeaderParam('location_id') location_id: string,
        @HeaderParam('authheader') authHeader: string,
        @HeaderParam('authusername') authUsername: string
    ): Promise<boolean> {

        return false;
    }

}