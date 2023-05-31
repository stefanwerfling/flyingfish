import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {DomainService} from '../../../inc/Db/MariaDb/DomainService.js';
import {DomainRecord as DomainRecordDB} from '../../../inc/Db/MariaDb/Entity/DomainRecord.js';

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
    disable: Vts.boolean(),
    parent_id: Vts.number()
});

export type DomainData = ExtractSchemaResultType<typeof SchemaDomainData>;

/**
 * DomainResponse
 */
export type DomainResponse = DefaultReturn & {
    list?: DomainData[];
};

/**
 * List
 */
export class List {

    /**
     * getDomains
     */
    public static async getDomains(): Promise<DomainResponse> {
        const domainRecordRepository = DBHelper.getRepository(DomainRecordDB);

        const domainList: DomainData[] = [];
        const domains = await DomainService.findAll();

        for await (const domain of domains) {
            const recordList: DomainRecord[] = [];

            const records = await domainRecordRepository.find({
                where: {
                    domain_id: domain.id
                }
            });

            for (const record of records) {
                recordList.push({
                    id: record.id,
                    type: record.dtype,
                    class: record.dclass,
                    ttl: record.ttl,
                    value: record.dvalue,
                    update_by_dnsclient: record.update_by_dnsclient,
                    last_update: record.last_update
                });
            }

            domainList.push({
                id: domain.id,
                name: domain.domainname,
                fix: domain.fixdomain,
                recordless: domain.recordless,
                disable: domain.disable,
                records: recordList,
                parent_id: domain.parent_id
            });
        }

        return {
            statusCode: StatusCodes.OK,
            list: domainList
        };
    }

}