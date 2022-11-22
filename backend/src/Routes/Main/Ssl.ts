import Path from 'path';
import {Body, Get, JsonController, Post, Session} from 'routing-controllers-extended';
import {Certificate} from '../../inc/Cert/Certificate.js';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {Domain as DomainDB} from '../../inc/Db/MariaDb/Entity/Domain.js';
import {NginxHttp as NginxHttpDB} from '../../inc/Db/MariaDb/Entity/NginxHttp.js';
import {Certbot} from '../../inc/Provider/Letsencrypt/Certbot.js';
import {SslProvider, SslProviders} from '../../inc/Provider/SslProviders.js';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';

/**
 * SslDetailsRequest
 */
export type SslDetailsRequest = {
    httpid: number;
};

/**
 * SslDetails
 */
export type SslDetails = {
    serialNumber: string;
    dateNotBefore: string;
    dateNotAfter: string;
};

/**
 * SslDetailsResponse
 */
export type SslDetailsResponse = DefaultReturn & {
    details?: SslDetails;
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
            list: list
        };
    }

    /**
     * getCertDetails
     * @param session
     * @param request
     */
    @Post('/json/ssl/cert/details')
    public async getCertDetails(@Session() session: any, @Body() request: SslDetailsRequest): Promise<SslDetailsResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const httpRepository = DBHelper.getRepository(NginxHttpDB);
            const domainRepository = DBHelper.getRepository(DomainDB);

            const http = await httpRepository.findOne({
                where: {
                    id: request.httpid
                }
            });

            if (http) {
                if (!http.ssl_enable) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'SSL is disabled!'
                    };
                }

                const domain = await domainRepository.findOne({
                    where: {
                        id: http.domain_id
                    }
                });

                if (domain) {
                    const sslCert = Certbot.existCertificate(domain.domainname);

                    if (sslCert) {
                        const cert = new Certificate(Path.join(sslCert, 'cert.pem'));

                        return {
                            statusCode: StatusCodes.OK,
                            details: {
                                serialNumber: cert.getSerialNumber().toString(),
                                dateNotBefore: cert.getDateNotBefore().toLocaleString(),
                                dateNotAfter: cert.getDateNotAfter().toLocaleString()
                            }
                        };
                    }
                }

                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Domain not found!'
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Http id not found!'
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}