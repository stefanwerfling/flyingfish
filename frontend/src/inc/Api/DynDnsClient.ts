import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * DynDnsClientDomain
 */
export type DynDnsClientDomain = {
    id: number;
    name: string;
};

/**
 * DynDnsClientProvider
 */
export type DynDnsClientProvider = {
    name: string;
    title: string;
};

/**
 * DynDnsClientData
 */
export type DynDnsClientData = {
    id: number;
    domains: DynDnsClientDomain[];
    provider: DynDnsClientProvider;
    username: string;
    password?: string;
    update_domain: boolean;
    last_status: number;
    last_status_msg: string;
    last_update: number;
};

/**
 * DynDnsClientListResponse
 */
export type DynDnsClientListResponse = DefaultReturn & {
    list: DynDnsClientData[];
};

/**
 * DynDnsProvider
 */
export type DynDnsProvider = {
    name: string;
    title: string;
};


/**
 * DynDnsClientProviderListResponse
 */
export type DynDnsClientProviderListResponse = DefaultReturn & {
    list: DynDnsProvider[];
};

/**
 * DynDnsClient
 */
export class DynDnsClient {

    /**
     * getClients
     */
    public static async getClients(): Promise<DynDnsClientListResponse| null> {
        const result = await NetFetch.getData('/json/dyndnsclient/list');

        if (result && result.statusCode) {
            switch(result.statusCode) {
                case StatusCodes.OK:
                    return result as DynDnsClientListResponse;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * getProviderList
     */
    public static async getProviderList(): Promise<DynDnsClientProviderListResponse| null> {
        const result = await NetFetch.getData('/json/dyndnsclient/provider/list');

        if (result && result.statusCode) {
            switch(result.statusCode) {
                case StatusCodes.OK:
                    return result as DynDnsClientProviderListResponse;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * saveClient
     * @param client
     */
    public static async saveClient(client: DynDnsClientData): Promise<boolean> {
        const result = await NetFetch.postData('/json/dyndnsclient/save', client);

        if (result && result.statusCode) {
            switch(result.statusCode) {
                case StatusCodes.OK:
                    return true;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return false;
    }

    /**
     * deleteClient
     * @param listen
     */
    public static async deleteClient(client: DynDnsClientData): Promise<boolean> {
        const result = await NetFetch.postData('/json/dyndnsclient/delete', client);

        if (result && result.statusCode) {
            switch(result.statusCode) {
                case StatusCodes.OK:
                    return true;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return false;
    }
}