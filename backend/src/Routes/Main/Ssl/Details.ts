import {DBHelper, DomainServiceDB} from 'flyingfish_core';
import {SslDetailInfoData, SslDetailsRequest, SslDetailsResponse, StatusCodes} from 'flyingfish_schemas';
import Path from 'path';
import {Certificate} from '../../../inc/Cert/Certificate.js';
import {NginxHttp as NginxHttpDB} from '../../../inc/Db/MariaDb/Entity/NginxHttp.js';
import {Certbot} from '../../../inc/Provider/Letsencrypt/Certbot.js';

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

            const domain = await DomainServiceDB.getInstance().findOne(http.domain_id);

            if (domain) {
                const sslCert = await Certbot.existCertificate(domain.domainname);

                if (sslCert) {
                    const cert = new Certificate(Path.join(sslCert, 'cert.pem'));

                    const issuerEntries: SslDetailInfoData[] = [];
                    const issuer = cert.getIssuer();

                    issuer.forEach((value, key) => {
                        issuerEntries.push({
                            key: key,
                            value: value
                        });
                    });

                    const subjectEntries: SslDetailInfoData[] = [];
                    const subject = cert.getSubject();

                    subject.forEach((value, key) => {
                        subjectEntries.push({
                            key: key,
                            value: value
                        });
                    });

                    return {
                        statusCode: StatusCodes.OK,
                        details: {
                            issuer: issuerEntries,
                            subject: subjectEntries,
                            serialNumber: cert.getSerialNumber().toString(),
                            dateNotBefore: cert.getDateNotBefore().toLocaleString(),
                            dateNotAfter: cert.getDateNotAfter().toLocaleString(),
                            signatureAlgorithm: cert.getSignatureAlgorithm(),
                            extensions: cert.getExtensions()
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