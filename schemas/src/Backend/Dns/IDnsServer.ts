import {DnsRecordBase} from './DnsRecordBase.js';

/**
 * Descript DNS Server object for API used
 */
export interface IDnsServer {

    /**
     * add a temporary record to a domain
     * @param {number} domainId
     * @param {DnsRecordBase} record
     * @returns {string} temporary identification
     */
    addTempRecord(domainId: number, record: DnsRecordBase): string;

    /**
     * remove a temporary record by identification
     * @param {string} tempId
     * @returns {boolean}
     */
    removeTempRecord(tempId: string): boolean;

    /**
     * remove all temporary record by domain id
     * @param {number} domainId
     * @returns {boolean}
     */
    removeAllTemp(domainId: number): boolean;

    /**
     * add a temporary domain with records
     * @param {string} domainName
     * @param {DnsRecordBase[]} records
     * @returns {boolean}
     */
    addTempDomain(domainName: string, records: DnsRecordBase[]): boolean;

    /**
     * remove temporary domain
     * @param {string} domainName
     * @returns {boolean}
     */
    removeTempDomain(domainName: string): boolean;

}