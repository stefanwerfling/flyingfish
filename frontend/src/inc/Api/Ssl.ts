import {
    SchemaSslDetailsResponse,
    SchemaSslProvidersResponse,
    SslDetails,
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
     * @throws
     */
    public static async getProviders(): Promise<SslProvidersResponse> {
        return NetFetch.getData('/json/ssl/provider/list', SchemaSslProvidersResponse);
    }

    /**
     * getCertDetails
     * @param httpid
     */
    public static async getCertDetails(httpid: number): Promise<SslDetails> {
        const resultContent = await NetFetch.postData('/json/ssl/cert/details', {httpid}, SchemaSslDetailsResponse);

        if (Vts.isUndefined(resultContent.details)) {
            throw new UnknownResponse('Ssl cert return empty details!');
        }

        return resultContent.details;
    }

}