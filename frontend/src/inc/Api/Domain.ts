import {NetFetch} from '../Net/NetFetch';

/**
 * DomainRecord
 */
export type DomainRecord = {
    id: number;
    type: number;
    class: number;
    ttl: number;
    value: string;
    update_by_dnsclient: boolean;
};

/**
 * DomainData
 */
export type DomainData = {
    id: number;
    name: string;
    fix: boolean;
    recordless: boolean;
    records: DomainRecord[];
};

/**
 * DomainResponse
 */
export type DomainResponse = {
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
    public static async getDomains(): Promise<DomainResponse| null> {
        const result = await NetFetch.getData('/json/domain/list');

        if (result) {
            if (result.status === 'ok') {
                return result as DomainResponse;
            }
        }

        return null;
    }

    /**
     * saveDomain
     * @param domain
     */
    public static async saveDomain(domain: DomainData) : Promise<boolean> {
        const result = await NetFetch.postData('/json/domain/save', domain);

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