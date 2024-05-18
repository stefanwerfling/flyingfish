import { ASslCertProviderOnLoadEvent } from 'flyingfish_core';
import { Certbot } from './Certbot.js';
export class SslCertProviderLoader extends ASslCertProviderOnLoadEvent {
    _providers = [
        new Certbot(),
    ];
    getName() {
        return 'letsencrypt';
    }
    async getProviders() {
        return this._providers;
    }
}
//# sourceMappingURL=SslCertProviderLoader.js.map