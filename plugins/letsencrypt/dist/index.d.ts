import { APlugin } from 'flyingfish_core';
export default class LetsEncrypt extends APlugin {
    getName(): string;
    onDisable(): boolean;
    onEnable(): boolean;
}
