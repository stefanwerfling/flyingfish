import {Body, JsonController, Post, Session} from 'routing-controllers';
import {NginxDomain as NginxDomainDB} from '../../inc/Db/MariaDb/Entity/NginxDomain';
import {NginxHttp as NginxHttpDB} from '../../inc/Db/MariaDb/Entity/NginxHttp';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {Certbot} from '../../inc/Letsencrypt/Certbot';
import {NginxService} from '../../inc/Service/NginxService';

/**
 * CertificateCreateResponse
 */
export type CertificateCreateResponse = {
    httpid: number;
};

/**
 * Certificate
 */
@JsonController()
export class Certificate {

    /**
     * TODO
     * @param session
     * @param request
     */
    @Post('/json/certificate/create')
    public async create(
        @Session() session: any,
        @Body() request: CertificateCreateResponse
    ): Promise<boolean> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const domainRepository = MariaDbHelper.getRepository(NginxDomainDB);
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
                        if (http.certbot_email === '') {
                            return false;
                        }

                        const certbot = new Certbot();
                        await certbot.create(domain.domainname, http.certbot_email);

                        await NginxService.getInstance().reload();

                        return true;
                    }
                }
            }
        }

        return false;
    }

}