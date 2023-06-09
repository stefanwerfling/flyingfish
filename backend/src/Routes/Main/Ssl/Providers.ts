import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {SslProviders, SslProvider} from '../../../inc/Provider/SslProviders.js';

/**
 * SslProvidersResponse
 */
export type SslProvidersResponse = DefaultReturn & {
    list: SslProvider[];
};

/**
 * Providers
 */
export class Providers {

    /**
     * getProviders
     */
    public static async getProviders(): Promise<SslProvidersResponse> {
        return {
            statusCode: StatusCodes.OK,
            list: SslProviders.getProviders()
        };
    }

}