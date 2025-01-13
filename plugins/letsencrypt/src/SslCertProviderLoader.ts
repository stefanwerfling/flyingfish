import {ASslCertProviderOnLoadEvent, ISslCertProvider} from 'flyingfish_core';
import {Certbot} from './Certbot.js';

/**
 * SSL Cert Provider loader
 */
export class SslCertProviderLoader extends ASslCertProviderOnLoadEvent {

    /**
     * Register of providers
     * @protected
     */
    protected _providers: ISslCertProvider[] = [
        new Certbot()
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