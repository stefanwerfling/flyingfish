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
    update_domain: boolean;
    last_status: number;
    last_status_msg: string;
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

    /**
     * saveClient
     * @param client
     */
    public static async saveClient(client: DynDnsClientData): Promise<boolean> {
        const result = await NetFetch.postData('/json/dyndnsclient/save', client);

        if (result) {
            if (result.status === 'ok') {
                return true;
            } else {
                throw new Error(result.error);
            }
        }

        return false;
    }

}