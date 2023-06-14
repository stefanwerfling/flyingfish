import {SslProvidersResponse, StatusCodes} from 'flyingfish_schemas';
import {SslProviders} from '../../../inc/Provider/SslProviders.js';

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