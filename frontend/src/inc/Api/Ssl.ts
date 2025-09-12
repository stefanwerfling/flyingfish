import {
    SchemaDefaultReturn,
    SchemaSslDetailsResponse, SchemaSslListWildcardResponse,
    SchemaSslProvidersResponse,
    SslDetails, SslListWildcardEntry,
    SslProvidersResponse
} from 'flyingfish_schemas';
import {Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch.js';
import {UnknownResponse} from './Error/UnknownResponse.js';

/**
 * Ssl
 */
export class Ssl {

    /**
     * getList
     * @return {SslProvidersResponse}
     * @throws
     */
    public static async getProviders(): Promise<SslProvidersResponse> {
        return NetFetch.getData('/json/ssl/provider/list', SchemaSslProvidersResponse);
    }

    /**
     * getCertDetails
     * @param {number} httpid
     */
    public static async getCertDetails(httpid: number): Promise<SslDetails> {
        const resultContent = await NetFetch.postData('/json/ssl/cert/details', {httpid: httpid}, SchemaSslDetailsResponse);

        if (Vts.isUndefined(resultContent.details)) {
            throw new UnknownResponse('Ssl cert return empty details!');
        }

        return resultContent.details;
    }

    /**
     * Run Service
     * @return {boolean}
     */
    public static async runService(): Promise<boolean> {
        await NetFetch.getData('/json/ssl/run/service', SchemaDefaultReturn);
        return true;
    }

    /**
     * Get All Cert for Wildcard
     * @param {number} domainId
     * @returns {SslListWildcardEntry[]}
     */
    public static async getAllCertforWildcard(domainId: number): Promise<SslListWildcardEntry[]> {
        const resultContent = await NetFetch.postData(
            '/json/ssl/cert/wildcards',
            {
                domain_id: domainId
            },
            SchemaSslListWildcardResponse
        );

        if (resultContent.list) {
            return resultContent.list;
        }

        return [];
    }

}