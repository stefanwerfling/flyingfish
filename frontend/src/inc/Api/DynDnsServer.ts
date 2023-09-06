import {
    DynDnsServerListResponse,
    SchemaDynDnsServerListResponse
} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch';

/**
 * DynDnsServer
 */
export class DynDnsServer {

    /**
     * getUsers
     */
    public static async getUsers(): Promise<DynDnsServerListResponse> {
        return NetFetch.getData('/json/dyndnsserver/list', SchemaDynDnsServerListResponse);
    }

}