import {NetFetch} from '../Net/NetFetch';

/**
 * HostListen
 */
export type HostListen = {
    listen_id: number;
};

/**
 * HostData
 */
export type HostData = {
    id: number;
    domainname: string;
    links: HostListen[];
};

/**
 * HostsResponse
 */
export type HostsResponse = {
    status: string;
    msg?: string;
    list: HostData[];
};

/**
 * Host
 */
export class Host {

    /**
     * getHosts
     */
    public static async getHosts(): Promise<HostsResponse| null> {
        const result = await NetFetch.getData('/json/host/list');

        if (result) {
            if (result.status === 'ok') {
                return result as HostsResponse;
            }
        }

        return null;
    }

}