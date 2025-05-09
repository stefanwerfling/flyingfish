import {
    DynDnsClientData, DynDnsClientDomainRunRequest,
    DynDnsClientListResponse, DynDnsClientProviderListResponse,
    SchemaDefaultReturn,
    SchemaDynDnsClientListResponse,
    SchemaDynDnsClientProviderListResponse
} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch.js';

/**
 * DynDnsClient
 */
export class DynDnsClient {

    /**
     * getClients
     */
    public static async getClients(): Promise<DynDnsClientListResponse> {
        return NetFetch.getData('/json/dyndnsclient/list', SchemaDynDnsClientListResponse);
    }

    /**
     * getProviderList
     */
    public static async getProviderList(): Promise<DynDnsClientProviderListResponse> {
        return NetFetch.getData('/json/dyndnsclient/provider/list', SchemaDynDnsClientProviderListResponse);
    }

    /**
     * saveClient
     * @param client
     */
    public static async saveClient(client: DynDnsClientData): Promise<boolean> {
        await NetFetch.postData('/json/dyndnsclient/save', client, SchemaDefaultReturn);
        return true;
    }

    /**
     * deleteClient
     * @param client
     */
    public static async deleteClient(client: DynDnsClientData): Promise<boolean> {
        await NetFetch.postData('/json/dyndnsclient/delete', client, SchemaDefaultReturn);
        return true;
    }

    /**
     * Run Service
     * @returns {boolean}
     */
    public static async runService(): Promise<boolean> {
        await NetFetch.getData('/json/dyndnsclient/run/service', SchemaDefaultReturn);
        return true;
    }

    /**
     * Run client
     * @param {number} clientId
     * @returns {boolean}
     */
    public static async runClient(clientId: number): Promise<boolean> {
        const req: DynDnsClientDomainRunRequest = {
            client: {
                id: clientId
            }
        };

        await NetFetch.postData('/json/dyndnsclient/run/client', req, SchemaDefaultReturn);

        return true;
    }

}