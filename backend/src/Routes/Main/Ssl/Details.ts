import {DomainServiceDB, NginxHttpServiceDB} from 'flyingfish_core';
import {SslDetailInfoData, SslDetailsRequest, SslDetailsResponse, StatusCodes} from 'flyingfish_schemas';
import {Certificate} from '../../../inc/Cert/Certificate.js';
import {SslCertProviders} from '../../../inc/Provider/SslCertProvider/SslCertProviders.js';

/**
 * Details
 */
export class Details {

    /**
     * getCertDetails
     * @param data
     */
    public static async getCertDetails(data: SslDetailsRequest): Promise<SslDetailsResponse> {
        const http = await NginxHttpServiceDB.getInstance().findOne(data.httpid);

        if (http) {
            if (!http.ssl_enable) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'SSL is disabled!'
                };
            }

            const domain = await DomainServiceDB.getInstance().findOne(http.domain_id);

            if (domain) {
                const sp = new SslCertProviders();
                const provider = await sp.getProvider(http.cert_provider);

                if (provider) {
                    // TODO Wildcard
                    const sslBundel = await provider.getCertificationBundel(
                        domain.domainname,
                        {
                            wildcard: false
                        }
                    );

                    if (sslBundel) {
                        const cert = new Certificate(sslBundel.certPem);

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

                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'Ssl Provider bundel return empty.'
                    };
                }

                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Ssl Provider not found!'
                };
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