import { APlugin, PluginServiceNames } from 'flyingfish_core';
import { LoadDb } from './LoadDb.js';
export default class DemoPlugin extends APlugin {
    getName() {
        return 'DemoPlugin';
    }
    onDisable() {
        return false;
    }
    onEnable() {
        if (this.getPluginManager().getServiceName() === PluginServiceNames.backend) {
            this.getPluginManager().registerEvents(new LoadDb(), this);
        }
        return false;
    }
}
//# sourceMappingURL=index.js.map