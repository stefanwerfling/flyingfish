import {ACertProviderOnLoadEvent} from 'flyingfish_core';
import {ISslCertProvider} from 'flyingfish_schemas';
import {Acme} from './Acme.js';
import {Certbot} from './Certbot.js';

/**
 * Provider loader
 */
export class ProviderLoader extends ACertProviderOnLoadEvent {

    /**
     * Register of providers
     * @protected
     */
    protected _providers: ISslCertProvider[] = [
        new Certbot(),
        new Acme()
    ];

    /**
     * Return the name form provider loader.
     * @returns {string}
     */
    public getName(): string {
        return 'letsencrypt';
    }

    /**
     * Return an array of providers.
     * @returns {ISslCertProvider[]}
     */
    public async getProviders(): Promise<ISslCertProvider[]> {
        return this._providers;
    }

}