import {
    CredentialProviderResponse,
    CredentialResponse,
    Credential as CredentialData,
    SchemaCredentialProviderResponse,
    SchemaCredentialResponse, SchemaDefaultReturn
} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch';

/**
 * Credential API
 */
export class Credential {

    /**
     * Return all Providers for Credential
     * @returns {CredentialProviderResponse}
     */
    public static async getProviderList(): Promise<CredentialProviderResponse> {
        return NetFetch.getData('/json/credential/provider/list', SchemaCredentialProviderResponse);
    }

    /**
     * Return all Credentials
     * @returns {CredentialResponse}
     */
    public static async getList(): Promise<CredentialResponse> {
        return NetFetch.getData('/json/credential/list', SchemaCredentialResponse);
    }

    /**
     * Save a credential
     * @param {CredentialData} data
     */
    public static async save(data: CredentialData): Promise<boolean> {
        await NetFetch.postData('/json/credential/save', data, SchemaDefaultReturn);
        return true;
    }

}