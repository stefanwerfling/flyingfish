import {ExtractSchemaResultType, Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch';
import {SchemaDefaultReturn} from './Types/DefaultReturn';

/**
 * DynDnsClientDomain
 */
export const SchemaDynDnsClientDomain = Vts.object({
    id: Vts.number(),
    name: Vts.string()
});

export type DynDnsClientDomain = ExtractSchemaResultType<typeof SchemaDynDnsClientDomain>;

/**
 * DynDnsClientProvider
 */
export const SchemaDynDnsClientProvider = Vts.object({
    name: Vts.string(),
    title: Vts.string()
});

export type DynDnsClientProvider = ExtractSchemaResultType<typeof SchemaDynDnsClientProvider>;

/**
 * DynDnsClientData
 */
export const SchemaDynDnsClientData = Vts.object({
    id: Vts.number(),
    domains: Vts.array(SchemaDynDnsClientDomain),
    provider: SchemaDynDnsClientProvider,
    username: Vts.string(),
    password: Vts.optional(Vts.string()),
    update_domain: Vts.boolean(),
    last_status: Vts.number(),
    last_status_msg: Vts.string(),
    last_update: Vts.number()
});

export type DynDnsClientData = ExtractSchemaResultType<typeof SchemaDynDnsClientData>;

/**
 * DynDnsClientListResponse
 */
export const SchemaDynDnsClientListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaDynDnsClientData)
});

export type DynDnsClientListResponse = ExtractSchemaResultType<typeof SchemaDynDnsClientListResponse>;

/**
 * DynDnsProvider
 */
export const SchemaDynDnsProvider = Vts.object({
    name: Vts.string(),
    title: Vts.string()
});

export type DynDnsProvider = ExtractSchemaResultType<typeof SchemaDynDnsProvider>;


/**
 * DynDnsClientProviderListResponse
 */
export const SchemaDynDnsClientProviderListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaDynDnsProvider)
});

export type DynDnsClientProviderListResponse = ExtractSchemaResultType<typeof SchemaDynDnsClientProviderListResponse>;

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

}