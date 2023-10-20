import {
    DynDnsServerData,
    DynDnsServerListResponse, DynDnsServerNotInDomainResponse, SchemaDefaultReturn,
    SchemaDynDnsServerListResponse, SchemaDynDnsServerNotInDomainResponse
} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch';

/**
 * Domain list for DynDns Server.
 */
export class DynDnsServer {

    /**
     * Return a list with user and domains.
     * @returns {DynDnsServerListResponse}
     */
    public static async getUsers(): Promise<DynDnsServerListResponse> {
        return NetFetch.getData('/json/dyndnsserver/list', SchemaDynDnsServerListResponse);
    }

    /**
     * Return all Domains that not is used for DynDns Server.
     * @returns {DynDnsServerNotInDomainResponse}
     */
    public static async getDomains(): Promise<DynDnsServerNotInDomainResponse> {
        return NetFetch.getData('/json/dyndnsserver/domain/list', SchemaDynDnsServerNotInDomainResponse);
    }

    /**
     * Save an dyn dns server entry.
     * @param {DynDnsServerData} data
     * @returns {boolean}
     */
    public static async save(data: DynDnsServerData): Promise<boolean> {
        await NetFetch.postData('/json/dyndnsserver/save', data, SchemaDefaultReturn);
        return true;
    }

    /**
     * Delete a dyn dns server entry.
     * @param {DynDnsServerData} data
     * @returns {boolean}
     */
    public static async delete(data: DynDnsServerData): Promise<boolean> {
        await NetFetch.postData('/json/dyndnsserver/delete', data, SchemaDefaultReturn);
        return true;
    }

}