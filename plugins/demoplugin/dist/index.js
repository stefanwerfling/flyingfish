import { Plugin } from 'flyingfish_core';
import { LoadDb } from './LoadDb.js';
export default class DemoPlugin extends Plugin {
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