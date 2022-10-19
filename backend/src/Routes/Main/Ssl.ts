import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {Domain as DomainDB} from '../../inc/Db/MariaDb/Entity/Domain';
import {NginxHttp as NginxHttpDB} from '../../inc/Db/MariaDb/Entity/NginxHttp';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {Certbot} from '../../inc/Provider/Letsencrypt/Certbot';
import {SslProvider, SslProviders} from '../../inc/Provider/SslProviders';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';
import {NginxService} from '../../inc/Service/NginxService';

/**
 * SslDetailsRequest
 */
export type SslDetailsRequest = {
    httpid: number;
};

/**
 * SslDetailsResponse
 */
export type SslDetailsResponse = DefaultReturn & {

};

/**
 * SslProvidersResponse
 */
export type SslProvidersResponse = {
    status: string;
    msg?: string;
    list: SslProvider[];
};

/**
 * Certificate
 */
@JsonController()
export class Ssl {

    /**
     * getProviders
     * @param session
     */
    @Get('/json/ssl/provider/list')
    public async getProviders(@Session() session: any): Promise<SslProvidersResponse> {
        let list: SslProvider[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            list = SslProviders.getProviders();
        }

        return {
            status: 'ok',
            list
        };
    }

    @Post('/json/ssl/details')
    public async getCertDetails(@Session() session: any, @Body() request: SslDetailsRequest): Promise<SslDetailsResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {

        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}