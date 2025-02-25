import {BaseProviders, ICredentialProvider, ICredentialProviders, ProviderType} from 'flyingfish_core';
import {ProviderEntry} from 'flyingfish_schemas';
import {CredentialProvider as CredentialProviderDatabase} from './Database/CredentialProvider.js';

/**
 * Credential providers
 */
export class CredentialProviders extends BaseProviders<ProviderEntry, ICredentialProvider> implements ICredentialProviders {

    /**
     * Return a provider by name
     * @param {string} name
     * @returns {ICredentialProvider | null}
     */
    public async getProvider(name: string): Promise<ICredentialProvider | null> {
        switch (name) {
            case CredentialProviderDatabase.NAME:
                return new CredentialProviderDatabase();
        }

        return this._getProvider(name, ProviderType.credential);
    }

    /**
     * Get a provider list with name and title.
     * @returns {ProviderEntry[]}
     */
    public async getProviders(): Promise<ProviderEntry[]> {
        const list: ProviderEntry[] = [
            new CredentialProviderDatabase().getProviderEntry()
        ];

        const plist = await this._getProviders(ProviderType.credential);

        if (plist) {
            list.push(...plist);
        }

        return list;
    }

}