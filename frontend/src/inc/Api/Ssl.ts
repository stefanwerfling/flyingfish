import {NetFetch} from '../Net/NetFetch';

/**
 * SslProvider
 */
export type SslProvider = {
    name: string;
    title: string;
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
 * Ssl
 */
export class Ssl {

    /**
     * getList
     */
    public static async getProviders(): Promise<SslProvidersResponse| null> {
        const result = await NetFetch.getData('/json/ssl/provider/list');

        if (result) {
            if (result.status === 'ok') {
                return result as SslProvidersResponse;
            }
        }

        return null;
    }
}