import {
    RegistryPartsResponse,
    RegistryUiContributionsResponse,
    SchemaRegistryPartsResponse,
    SchemaRegistryUiContributionsResponse
} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch.js';

/**
 * Registry (Hub) API client.
 */
export class Registry {

    /**
     * Return the registered parts and their health status.
     */
    public static async getParts(): Promise<RegistryPartsResponse> {
        return NetFetch.getData('/json/registry/parts', SchemaRegistryPartsResponse);
    }

    /**
     * Return the aggregated UI contributions of the online parts.
     */
    public static async getUiContributions(): Promise<RegistryUiContributionsResponse> {
        return NetFetch.getData('/json/registry/ui-contributions', SchemaRegistryUiContributionsResponse);
    }

}