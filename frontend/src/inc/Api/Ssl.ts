import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

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
 * SslDetails
 */
export type SslDetails = {
    serialNumber: string;
    dateNotBefore: string;
    dateNotAfter: string;
};

/**
 * SslDetailsResponse
 */
export type SslDetailsResponse = DefaultReturn & {
    details?: SslDetails;
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

    /**
     * getCertDetails
     * @param httpid
     */
    public static async getCertDetails(httpid: number): Promise<SslDetails| null> {
        const result = await NetFetch.postData('/json/ssl/cert/details', {
            httpid: httpid
        });

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result.details as SslDetails;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }
}