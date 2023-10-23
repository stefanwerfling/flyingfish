import {SslProvidersResponse, StatusCodes} from 'flyingfish_schemas';
import {SslCertProviders} from '../../../inc/Provider/SslCertProvider/SslCertProviders.js';

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
            list: await SslCertProviders.getProviders()
        };
    }

}