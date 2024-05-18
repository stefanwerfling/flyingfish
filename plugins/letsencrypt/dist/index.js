import { APlugin, PluginServiceNames } from 'flyingfish_core';
import { SslCertProviderLoader } from './SslCertProviderLoader.js';
export default class LetsEncrypt extends APlugin {
    getName() {
        return 'LetsEncrypt';
    }
    onDisable() {
        return false;
    }
    onEnable() {
        if (this.getPluginManager().getServiceName() === PluginServiceNames.backend) {
            this.getPluginManager().registerEvents(new SslCertProviderLoader(), this);
        }
        return true;
    }
}
//# sourceMappingURL=index.js.map