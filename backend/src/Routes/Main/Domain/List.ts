import {DBHelper, DomainRecordDB, DomainService} from 'flyingfish_core';
import {DomainData, DomainRecord, DomainResponse, StatusCodes} from 'flyingfish_schemas';

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