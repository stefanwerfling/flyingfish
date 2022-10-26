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
    last_update: number;
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
    disable: boolean;
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
 * DomainRecordSave
 */
export type DomainRecordSave = {
    domain_id: number;
    record: DomainRecord;
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
    public static async saveDomain(domain: DomainData): Promise<boolean> {
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

    /**
     * deleteDomain
     * @param listen
     */
    public static async deleteDomain(domain: DomainData): Promise<boolean> {
        const result = await NetFetch.postData('/json/domain/delete', domain);

        if (result) {
            if (result.status === 'ok') {
                return true;
            } else {
                throw new Error(result.error);
            }
        }

        return false;
    }

    /**
     * saveDomainRecord
     * @param srecord
     */
    public static async saveDomainRecord(srecord: DomainRecordSave): Promise<boolean> {
        const result = await NetFetch.postData('/json/domain/record/save', srecord);

        if (result) {
            if (result.status === 'ok') {
                return true;
            } else {
                throw new Error(result.error);
            }
        }

        return false;
    }

    /**
     * deleteDomainRecord
     * @param listen
     */
    public static async deleteDomainRecord(record: DomainRecord): Promise<boolean> {
        const result = await NetFetch.postData('/json/domain/record/delete', record);

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