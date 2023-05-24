import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {DynDnsProviders} from '../../../inc/Provider/DynDnsProviders.js';

/**
 * DynDnsClientProviderListResponse
 */
export type DynDnsClientProviderListResponse = DefaultReturn & {
    list: DynDnsProviders[];
};

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