import {BaseProviders, ISslCertProvider, ISslCertProviders, ProviderType} from 'flyingfish_core';
import {ProviderSslEntry} from 'flyingfish_schemas';

/**
 * Ssl Certificate provider.
 */
export class SslCertProviders extends BaseProviders<ProviderSslEntry, ISslCertProvider> implements ISslCertProviders {

    /**
     * Get a provider object by provider name.
     * @param {string} name - Name of provider.
     * @returns {ISslCertProvider|null}
     */
    public async getProvider(name: string): Promise<ISslCertProvider | null> {
        return this._getProvider(name, ProviderType.sslcert);
    }

    /**
     * Get a provider list with name and title.
     * @returns {ProviderSslEntry[]}
     */
    public async getProviders(): Promise<ProviderSslEntry[]> {
        return this._getProviders(ProviderType.sslcert);
    }

}