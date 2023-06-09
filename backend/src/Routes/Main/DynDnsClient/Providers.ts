import {DynDnsClientProviderListResponse, StatusCodes} from 'flyingfish_schemas';
import {DynDnsProviders} from '../../../inc/Provider/DynDnsProviders.js';

/**
 * Providers
 */
export class Providers {

    /**
     * getProviders
     */
    public static async getProviders(): Promise<DynDnsClientProviderListResponse> {
        return {
            statusCode: StatusCodes.OK,
            list: DynDnsProviders.getProviders()
        };
    }

}