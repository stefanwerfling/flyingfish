import {
    BaseProviders,
    ICredentialProvider,
    ICredentialProviders
} from 'flyingfish_core';
import {ProviderEntry} from 'flyingfish_schemas';

/**
 * Credential providers
 */
export class CredentialProviders extends BaseProviders implements ICredentialProviders {

    /**
     * Return a provider by name
     * @param {string} name
     * @returns {ICredentialProvider | null}
     */
    public async getProvider(name: string): Promise<ICredentialProvider | null> {
        return  this._getProvider<ICredentialProvider>(name);
    }

    public getProviders(): Promise<ProviderEntry[]> {
        return Promise.resolve([]);
    }

}