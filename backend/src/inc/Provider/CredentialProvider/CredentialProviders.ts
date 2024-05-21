import {
    BaseProviders,
    ICredentialProvider,
    ICredentialProviders
} from 'flyingfish_core';
import {ProviderEntry} from 'flyingfish_schemas';
import {CredentialProvider as CredentialProviderDatabase} from './Database/CredentialProvider.js';

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
        switch (name) {
            case CredentialProviderDatabase.NAME:
                return new CredentialProviderDatabase();

            default:
                return this._getProvider<ICredentialProvider>(name);
        }
    }

    /**
     * Get a provider list with name and title.
     * @returns {ProviderEntry[]}
     */
    public async getProviders(): Promise<ProviderEntry[]> {
        const list: ProviderEntry[] = [];

        const plist = await this._getProviders<ICredentialProvider>();

        if (plist) {
            list.push(...plist);
        }

        return list;
    }

}