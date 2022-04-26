import {NetFetch} from '../Net/NetFetch';

/**
 * DomainLink
 */
export type DomainLink = {
    listen_id: number;
};

/**
 * DomainData
 */
export type DomainData = {
    id: number;
    domainname: string;
    links: DomainLink[];
};

/**
 * DomainsResponse
 */
export type DomainsResponse = {
    status: string;
    msg?: string;
    list: DomainData[];
};

/**
 * Domain
 */
export class Domain {

    /**
     * getDomains
     */
    public static async getDomains(): Promise<DomainsResponse| null> {
        const result = await NetFetch.getData('/json/domain/list');

        if (result) {
            if (result.status === 'ok') {
                return result as DomainsResponse;
            }
        }

        return null;
    }

}