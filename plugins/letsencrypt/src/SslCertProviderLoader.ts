import {ASslCertProviderOnLoadEvent, ISslCertProvider} from 'flyingfish_core';
import {LetsEncryptDns01} from './LetsEncryptDns01.js';
import {LetsEncryptHttp01} from './LetsEncryptHttp01.js';

/**
 * SSL Cert Provider loader
 */
export class SslCertProviderLoader extends ASslCertProviderOnLoadEvent {

    /**
     * Register of providers
     * @protected
     */
    protected _providers: ISslCertProvider[] = [
        new LetsEncryptHttp01(),
        new LetsEncryptDns01()
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