import {
    CredentialProviderResponse,
    CredentialResponse,
    SchemaCredentialProviderResponse,
    SchemaCredentialResponse
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

}