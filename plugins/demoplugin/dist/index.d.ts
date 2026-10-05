import { AFlyingFishPlugin, PluginUiField } from 'flyingfish_core';
export default class DemoPlugin extends AFlyingFishPlugin {
    getName(): string;
    getUiSchema(): PluginUiField[];
    onDisable(): Promise<boolean>;
    onEnable(): Promise<boolean>;
}
