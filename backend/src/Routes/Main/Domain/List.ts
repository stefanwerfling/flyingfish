import {DomainRecordServiceDB, DomainServiceDB} from 'flyingfish_core';
import {
    DomainData,
    DomainRecord,
    DomainResponse,
    StatusCodes
} from 'flyingfish_schemas';

/**
 * List
 */
export class List {

    /**
     * getDomains
     */
    public static async getDomains(): Promise<DomainResponse> {
        const domainList: DomainData[] = [];
        const domains = await DomainServiceDB.getInstance().findAll();

        for await (const domain of domains) {
            const recordList: DomainRecord[] = [];

            const records = await DomainRecordServiceDB.getInstance().findAllByDomain(domain.id);

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