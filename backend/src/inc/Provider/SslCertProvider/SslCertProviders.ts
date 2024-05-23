import {BaseProviders, ISslCertProvider, ISslCertProviders, ProviderType} from 'flyingfish_core';
import {ProviderEntry} from 'flyingfish_schemas';

/**
 * Ssl Certificate provider.
 */
export class SslCertProviders extends BaseProviders implements ISslCertProviders {

    /**
     * Get a provider object by provider name.
     * @param {string} name - Name of provider.
     * @returns {ISslCertProvider|null}
     */
    public async getProvider(name: string): Promise<ISslCertProvider | null> {
        return this._getProvider<ISslCertProvider>(name, ProviderType.sslcert);
    }

    /**
     * Get a provider list with name and title.
     * @returns {ProviderEntry[]}
     */
    public async getProviders(): Promise<ProviderEntry[]> {
        return this._getProviders<ISslCertProvider>(ProviderType.sslcert);
    }

}