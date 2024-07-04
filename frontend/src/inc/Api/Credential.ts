import {
    CredentialProviderResponse,
    CredentialResponse,
    Credential as CredentialData,
    SchemaCredentialProviderResponse,
    SchemaCredentialResponse,
    SchemaDefaultReturn,
    CredentialUser,
    CredentialUsersRequest,
    SchemaCredentialUsersResponse
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
     * @returns {boolean}
     */
    public static async save(data: CredentialData): Promise<boolean> {
        await NetFetch.postData('/json/credential/save', data, SchemaDefaultReturn);
        return true;
    }

    /**
     * Return the credential userlist
     * @param {number} credentialId
     * @returns {CredentialUser[]}
     */
    public static async getUserList(credentialId: number): Promise<CredentialUser[]> {
        const req: CredentialUsersRequest = {
            credential_id: credentialId
        };

        const response = await NetFetch.postData('/json/credential/user/list', req, SchemaCredentialUsersResponse);

        if (response.list) {
            return response.list;
        }

        return [];
    }

    /**
     * Save a user
     * @param {CredentialUser} data
     * @returns {boolean}
     */
    public static async saveUser(data: CredentialUser): Promise<boolean> {
        await NetFetch.postData('/json/credential/user/save', data, SchemaDefaultReturn);
        return true;
    }

}