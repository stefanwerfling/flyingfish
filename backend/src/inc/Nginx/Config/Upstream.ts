import {Context, ContextNames} from './Context';

/**
 * Upstream
 */
export class Upstream extends Context {

    /**
     * stream name
     * @protected
     */
    protected _streamName: string;

    /**
     * constructor
     * @param streamName
     */
    public constructor(streamName: string) {
        super(ContextNames.upstream);

        this._streamName = streamName;
    }

    /**
     * generate
     * @param index
     */
    public generate(index: number = 0): string {
        let buffer = this._createContent(`${this._name} ${this._streamName} {`, index);

        buffer += this._generateStr(index);

        return buffer + this._createContent('}', index);
    }

}