import {
    DynDnsServerData,
    DynDnsServerListResponse, SchemaDefaultReturn,
    SchemaDynDnsServerListResponse
} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch';

/**
 * DynDnsServer
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