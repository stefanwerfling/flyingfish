import {Router} from 'express';
import {DefaultReturn, DefaultRoute, StatusCodes} from 'flyingfish_core';
import Path from 'path';
import {ExtractSchemaResultType, Vts} from 'vts';
import {Certificate} from '../../inc/Cert/Certificate.js';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {Domain as DomainDB} from '../../inc/Db/MariaDb/Entity/Domain.js';
import {NginxHttp as NginxHttpDB} from '../../inc/Db/MariaDb/Entity/NginxHttp.js';
import {Certbot} from '../../inc/Provider/Letsencrypt/Certbot.js';
import {SslProvider, SslProviders} from '../../inc/Provider/SslProviders.js';

/**
 * SslDetailsRequest
 */
export const SchemaSslDetailsRequest = Vts.object({
    httpid: Vts.number()
});

export type SslDetailsRequest = ExtractSchemaResultType<typeof SchemaSslDetailsRequest>;

/**
 * SslDetails
 */
export const SchemaSslDetails = Vts.object({
    serialNumber: Vts.string(),
    dateNotBefore: Vts.string(),
    dateNotAfter: Vts.string()
});

export type SslDetails = ExtractSchemaResultType<typeof SchemaSslDetails>;

/**
 * SslDetailsResponse
 */
export type SslDetailsResponse = DefaultReturn & {
    details?: SslDetails;
};

/**
 * SslProvidersResponse
 */
export type SslProvidersResponse = DefaultReturn & {
    list: SslProvider[];
};

/**
 * Certificate
 */
export class Ssl extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * getProviders
     */
    public async getProviders(): Promise<SslProvidersResponse> {
        return {
            statusCode: StatusCodes.OK,
            list: SslProviders.getProviders()
        };
    }

    /**
     * getCertDetails
     * @param data
     */
    public async getCertDetails(data: SslDetailsRequest): Promise<SslDetailsResponse> {
        const httpRepository = DBHelper.getRepository(NginxHttpDB);
        const domainRepository = DBHelper.getRepository(DomainDB);

        const http = await httpRepository.findOne({
            where: {
                id: data.httpid
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

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/ssl/provider/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getProviders());
                }
            }
        );

        this._routes.post(
            '/json/ssl/cert/details',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaSslDetailsRequest, req.body, res)) {
                        res.status(200).json(await this.getCertDetails(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}