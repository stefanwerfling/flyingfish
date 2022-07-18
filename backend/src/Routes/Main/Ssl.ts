import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {Domain as DomainDB} from '../../inc/Db/MariaDb/Entity/Domain';
import {NginxHttp as NginxHttpDB} from '../../inc/Db/MariaDb/Entity/NginxHttp';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {Certbot} from '../../inc/Provider/Letsencrypt/Certbot';
import {SslProvider, SslProviders} from '../../inc/Provider/SslProviders';
import {NginxService} from '../../inc/Service/NginxService';

/**
 * SslCreateResponse
 */
export type SslCreateResponse = {
    httpid: number;
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

    /**
     * createCert
     * @param session
     * @param request
     */
    @Post('/json/ssl/createcert')
    public async createCert(
        @Session() session: any,
        @Body() request: SslCreateResponse
    ): Promise<boolean> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const domainRepository = MariaDbHelper.getRepository(DomainDB);
            const httpRepository = MariaDbHelper.getRepository(NginxHttpDB);

            const http = await httpRepository.findOne({
                where: {
                    id: request.httpid
                }
            });

            if (http) {
                if (http.ssl_enable) {
                    const domain = await domainRepository.findOne({
                        where: {
                            id: http.domain_id
                        }
                    });

                    if (domain) {
                        if (http.cert_email === '') {
                            return false;
                        }

                        const certbot = new Certbot();
                        await certbot.create(domain.domainname, http.cert_email);

                        await NginxService.getInstance().reload();

                        return true;
                    }
                }
            }
        }

        return false;
    }

}