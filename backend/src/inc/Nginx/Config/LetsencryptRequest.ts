import {Server} from './Server';

/**
 * LetsencryptRequest
 */
export class LetsencryptRequest extends Server {

    /**
     * set defaults
     * @protected
     */
    protected _setDefaults(): void {
        super._setDefaults();
    }

    /**
     * generate
     * @param index
     */
    public generate(index: number = 0): string {
        let buffer = this._createContent(`${this._name} {`, index);

        buffer += this._generateStr(index);

        return buffer + this._createContent('}', index);
    }

}