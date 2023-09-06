import { Plugin } from 'flyingfish_core';
declare class DemoPlugin extends Plugin {
    getName(): string;
    onDisable(): boolean;
    onEnable(): boolean;
}
export default DemoPlugin;
