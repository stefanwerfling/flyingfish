import {DBHelper, DomainRecordDB} from 'flyingfish_core';
import {DomainRecordSave, DomainRecordSaveResponse, StatusCodes} from 'flyingfish_schemas';
import {HowIsMyPublicIpService} from '../../../../inc/Service/HowIsMyPublicIpService.js';

/**
 * Save
 */
export class Save {

    /**
     * saveDomainRecord
     * @param data
     */
    public static async saveDomainRecord(data: DomainRecordSave): Promise<DomainRecordSaveResponse> {
        const domainRecordRepository = DBHelper.getRepository(DomainRecordDB);

        let aRecord: DomainRecordDB | null = null;

        if (data.record.id !== 0) {
            const tRecord = await domainRecordRepository.findOne({
                where: {
                    id: data.record.id
                }
            });

            if (tRecord) {
                aRecord = tRecord;
            }
        }

        if (aRecord === null) {
            aRecord = new DomainRecordDB();
            aRecord.domain_id = data.domain_id;
        }

        aRecord.dtype = data.record.type;
        aRecord.dclass = data.record.class;
        aRecord.ttl = data.record.ttl;
        aRecord.dvalue = data.record.value;
        aRecord.update_by_dnsclient = data.record.update_by_dnsclient;

        // when update by dnsclient, then set value for ip by public ip
        if (aRecord.dvalue === '' && aRecord.update_by_dnsclient) {
            const publicIp = await HowIsMyPublicIpService.getInstance().getCurrentIp();

            if (publicIp) {
                aRecord.dvalue = publicIp;
            }
        }

        await DBHelper.getDataSource().manager.save(aRecord);

        return {
            statusCode: StatusCodes.OK
        };
    }

}