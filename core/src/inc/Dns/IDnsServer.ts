import {DnsRecordBase} from './DnsRecordBase.js';

/**
 * Descript DNS Server object for API used.
 *
 * Backed by a shared store (the `acme_dns_temp_record` table) so the temporary
 * ACME DNS-01 records survive the process boundary between the backend and the
 * standalone DNS server. The methods are async because the store is the
 * database.
 */
export interface IDnsServer {

    /**
     * add a temporary domain with records
     * @param {string} domainName
     * @param {DnsRecordBase[]} records
     * @returns {Promise<boolean>}
     */
    addTempDomain(domainName: string, records: DnsRecordBase[]): Promise<boolean>;

    /**
     * remove temporary domain
     * @param {string} domainName
     * @returns {Promise<boolean>}
     */
    removeTempDomain(domainName: string): Promise<boolean>;

}