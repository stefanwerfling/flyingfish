import {SchemaDefaultReturn} from 'flyingfish_schemas';
import {ExtractSchemaResultType, Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch';

/**
 * SslProvider
 */
export const SchemaSslProvider = Vts.object({
    name: Vts.string(),
    title: Vts.string()
});

export type SslProvider = ExtractSchemaResultType<typeof SchemaSslProvider>;

/**
 * SslProvidersResponse
 */
export const SchemaSslProvidersResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaSslProvider)
});

export type SslProvidersResponse = ExtractSchemaResultType<typeof SchemaSslProvidersResponse>;

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
export const SchemaSslDetailsResponse = SchemaDefaultReturn.extend({
    details: Vts.optional(SchemaSslDetails)
});

export type SslDetailsResponse = ExtractSchemaResultType<typeof SchemaSslDetailsResponse>;

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

        return resultContent.details;
    }

}