import {
    DomainData,
    DomainRecordDelete,
    DomainRecordSave,
    DomainResponse,
    SchemaDomainDeleteResponse, SchemaDomainRecordDeleteResponse, SchemaDomainRecordSaveResponse,
    SchemaDomainResponse, SchemaDomainSaveResponse
} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch.js';

/**
 * Domain
 */
export class Domain {

    /**
     * getDomains
     */
    public static async getDomains(): Promise<DomainResponse> {
        return NetFetch.getData('/json/domain/list', SchemaDomainResponse);
    }

    /**
     * saveDomain
     * @param domain
     */
    public static async saveDomain(domain: DomainData): Promise<boolean> {
        await NetFetch.postData('/json/domain/save', domain, SchemaDomainSaveResponse);
        return true;
    }

    /**
     * deleteDomain
     * @param domain
     */
    public static async deleteDomain(domain: DomainData): Promise<boolean> {
        await NetFetch.postData('/json/domain/delete', domain, SchemaDomainDeleteResponse);
        return true;
    }

    /**
     * saveDomainRecord
     * @param srecord
     */
    public static async saveDomainRecord(srecord: DomainRecordSave): Promise<boolean> {
        await NetFetch.postData('/json/domain/record/save', srecord, SchemaDomainRecordSaveResponse);
        return true;
    }

    /**
     * deleteDomainRecord
     * @param record
     */
    public static async deleteDomainRecord(record: DomainRecordDelete): Promise<boolean> {
        await NetFetch.postData('/json/domain/record/delete', record, SchemaDomainRecordDeleteResponse);
        return true;
    }

}