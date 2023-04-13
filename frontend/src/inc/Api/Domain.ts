import {ExtractSchemaResultType, Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch';
import {SchemaDefaultReturn} from './Types/DefaultReturn';

/**
 * DomainRecord
 */
export const SchemaDomainRecord = Vts.object({
    id: Vts.number(),
    type: Vts.number(),
    class: Vts.number(),
    ttl: Vts.number(),
    value: Vts.string(),
    update_by_dnsclient: Vts.boolean(),
    last_update: Vts.number()
});

export type DomainRecord = ExtractSchemaResultType<typeof SchemaDomainRecord>;

/**
 * DomainData
 */
export const SchemaDomainData = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
    fix: Vts.boolean(),
    recordless: Vts.boolean(),
    records: Vts.array(SchemaDomainRecord),
    disable: Vts.boolean()
});

export type DomainData = ExtractSchemaResultType<typeof SchemaDomainData>;

/**
 * DomainResponse
 */
export const SchemaDomainResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaDomainData)
});

export type DomainResponse = ExtractSchemaResultType<typeof SchemaDomainResponse>;

/**
 * DomainRecordSave
 */
export const SchemaDomainRecordSave = Vts.object({
    domain_id: Vts.number(),
    record: SchemaDomainRecord
});

export type DomainRecordSave = ExtractSchemaResultType<typeof SchemaDomainRecordSave>;

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
        await NetFetch.postData('/json/domain/save', domain, SchemaDefaultReturn);
        return true;
    }

    /**
     * deleteDomain
     * @param domain
     */
    public static async deleteDomain(domain: DomainData): Promise<boolean> {
        await NetFetch.postData('/json/domain/delete', domain, SchemaDefaultReturn);
        return true;
    }

    /**
     * saveDomainRecord
     * @param srecord
     */
    public static async saveDomainRecord(srecord: DomainRecordSave): Promise<boolean> {
        await NetFetch.postData('/json/domain/record/save', srecord, SchemaDefaultReturn);
        return true;
    }

    /**
     * deleteDomainRecord
     * @param record
     */
    public static async deleteDomainRecord(record: DomainRecord): Promise<boolean> {
        await NetFetch.postData('/json/domain/record/delete', record, SchemaDefaultReturn);
        return true;
    }

}