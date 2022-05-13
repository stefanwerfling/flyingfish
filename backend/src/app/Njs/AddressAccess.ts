import {Response} from 'express';
import {Get, HeaderParam, JsonController, Res} from 'routing-controllers';

/**
 * AddressAccess
 */
@JsonController()
export class AddressAccess {

    /**
     * access
     * @param realip_remote_addr
     * @param remote_addr
     * @param type
     */
    @Get('/njs/address_access')
    public async access(
        @Res() response: Response,
        @HeaderParam('realip_remote_addr') realip_remote_addr: string,
        @HeaderParam('remote_addr') remote_addr: string,
        @HeaderParam('type') type: string
    ): Promise<boolean> {
        console.log(`realip_remote_addr: ${realip_remote_addr} remote_addr: ${remote_addr} type: ${type}`);

        if (realip_remote_addr) {
            // Todo
            if (realip_remote_addr === '192.168.0.119') {
                response.status(200);
                return true;
            }
        }

        response.status(401);

        return false;
    }

}