import { Plugin } from 'flyingfish_core';
import { ProviderLoader } from './ProviderLoader.js';
export default class LetsEncrypt extends Plugin {
    getName() {
        return 'LetsEncrypt';
    }
    onDisable() {
        return false;
    }
    onEnable() {
        const pl = new ProviderLoader();
        this.getPluginManager().registerEvents(pl, this);
        return true;
    }
}
//# sourceMappingURL=index.js.map