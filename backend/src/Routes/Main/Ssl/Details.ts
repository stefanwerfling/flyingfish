import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import Path from 'path';
import {Certificate} from '../../../inc/Cert/Certificate.js';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {DomainService} from '../../../inc/Db/MariaDb/DomainService.js';
import {Domain as DomainDB} from '../../../inc/Db/MariaDb/Entity/Domain.js';
import {NginxHttp as NginxHttpDB} from '../../../inc/Db/MariaDb/Entity/NginxHttp.js';
import {Certbot} from '../../../inc/Provider/Letsencrypt/Certbot.js';

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
 * Details
 */
export class Details {

    /**
     * getCertDetails
     * @param data
     */
    public static async getCertDetails(data: SslDetailsRequest): Promise<SslDetailsResponse> {
        const httpRepository = DBHelper.getRepository(NginxHttpDB);

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

            const domain = await DomainService.findOne(http.domain_id);

            if (domain) {
                const sslCert = await Certbot.existCertificate(domain.domainname);

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

}