import { APlugin } from 'flyingfish_core';
import { LoadDb } from './LoadDb.js';
export default class DemoPlugin extends APlugin {
    getName() {
        return 'DemoPlugin';
    }
    onDisable() {
        return false;
    }
    onEnable() {
        this.getPluginManager().registerEvents(new LoadDb(), this);
        return false;
    }
}
//# sourceMappingURL=index.js.map