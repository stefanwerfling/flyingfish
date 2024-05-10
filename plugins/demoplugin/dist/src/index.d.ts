import { APlugin } from 'flyingfish_core';
export default class DemoPlugin extends APlugin {
    getName(): string;
    onDisable(): boolean;
    onEnable(): boolean;
}
