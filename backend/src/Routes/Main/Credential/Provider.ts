import {CredentialProviderResponse, StatusCodes} from 'flyingfish_schemas';
import {CredentialProviders} from '../../../inc/Provider/CredentialProvider/CredentialProviders.js';

export class Provider {

    public static async getProviders(): Promise<CredentialProviderResponse> {
        const cp = new CredentialProviders();
        const providers = await cp.getProviders();

        return {
            statusCode: StatusCodes.OK,
            list: providers
        };
    }

}