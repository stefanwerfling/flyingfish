import {DeleteResult} from 'typeorm';
import {DBService} from '../DBService.js';
import {DomainRecord} from '../Entity/DomainRecord.js';

/**
 * Domain record service object.
 */
export class DomainRecordService extends DBService<DomainRecord> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'domain_record';

    /**
     * Return an intance from domain record service.
     * @returns {DomainRecordService}
     */
    public static getInstance(): DomainRecordService {
        return DBService.getSingleInstance(
            DomainRecordService,
            DomainRecord,
            DomainRecordService.REGISTER_NAME
        );
    }

    /**
     * Find all domain records by domain id, class and type.
     * @param {number} domainId
     * @param {number|undefined} dclass
     * @param {number|undefined} dtype
     * @returns {DomainRecord[]}
     */
    public async findAllBy(domainId: number, dclass: number|undefined, dtype: number|undefined): Promise<DomainRecord[]> {
        return this._repository.find({
            where: {
                domain_id: domainId,
                dclass: dclass,
                dtype: dtype
            }
        });
    }

    /**
     * Find all domain records by domain id.
     * @param {number} domainId
     * @returns {DomainRecord[]}
     */
    public async findAllByDomain(domainId: number): Promise<DomainRecord[]> {
        return this._repository.find({
            where: {
                domain_id: domainId
            }
        });
    }

    /**
     * Find all domain records by domain id and have dnsclient update or not.
     * @param {number} domainId
     * @param {boolean} updateDnsClient
     * @returns {DomainRecord[]}
     */
    public async findAllByDomainUpdateDnsClient(domainId: number, updateDnsClient: boolean): Promise<DomainRecord[]> {
        return this._repository.find({
            where: {
                domain_id: domainId,
                update_by_dnsclient: updateDnsClient
            }
        });
    }

    /**
     * Remove all domain records by domain id.
     * @param {number} domainId
     * @returns {DeleteResult}
     */
    public async removeAllByDomain(domainId: number): Promise<DeleteResult> {
        return this._repository.delete({
            domain_id: domainId
        });
    }

}