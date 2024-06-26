import {CredentialProviderResponse, StatusCodes} from 'flyingfish_schemas';
import {CredentialProviders} from '../../../inc/Provider/CredentialProvider/CredentialProviders.js';

/**
 * Provider
 */
export class Provider {

    /**
     * Get providers
     * @returns {CredentialProviderResponse}
     */
    public static async getProviders(): Promise<CredentialProviderResponse> {
        const cps = new CredentialProviders();
        const providers = await cps.getProviders();

        return {
            statusCode: StatusCodes.OK,
            list: providers
        };
    }

}