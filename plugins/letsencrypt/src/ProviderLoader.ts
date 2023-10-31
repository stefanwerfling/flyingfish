import {ACertProviderOnLoadEvent} from 'flyingfish_core';
import {ISslCertProvider} from 'flyingfish_schemas';
import {Acme} from './Acme.js';
import {Certbot} from './Certbot.js';

export class ProviderLoader extends ACertProviderOnLoadEvent {

    protected _providers: ISslCertProvider[] = [
        new Certbot(),
        new Acme()
    ];

    public getName(): string {
        return 'letsencrypt';
    }

    public async getProviders(): Promise<ISslCertProvider[]> {
        return this._providers;
    }

}