import { ACertProviderOnLoadEvent } from 'flyingfish_core';
import { Acme } from './Acme.js';
import { Certbot } from './Certbot.js';
export class ProviderLoader extends ACertProviderOnLoadEvent {
    _providers = [
        new Certbot(),
        new Acme()
    ];
    getName() {
        return 'letsencrypt';
    }
    async getProviders() {
        return this._providers;
    }
}
//# sourceMappingURL=ProviderLoader.js.map