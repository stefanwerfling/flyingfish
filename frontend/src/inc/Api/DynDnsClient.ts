import {NetFetch} from '../Net/NetFetch';

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
    last_update: number;
};

/**
 * DynDnsClientListResponse
 */
export type DynDnsClientListResponse = {
    status: string;
    msg?: string;
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
export type DynDnsClientProviderListResponse = {
    status: string;
    msg?: string;
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

        if (result) {
            if (result.status === 'ok') {
                return result as DynDnsClientListResponse;
            }
        }

        return null;
    }

    /**
     * getProviderList
     */
    public static async getProviderList(): Promise<DynDnsClientProviderListResponse| null> {
        const result = await NetFetch.getData('/json/dyndnsclient/provider/list');

        if (result) {
            if (result.status === 'ok') {
                return result as DynDnsClientProviderListResponse;
            }
        }

        return null;
    }
}