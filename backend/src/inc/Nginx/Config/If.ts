import {Context, ContextNames} from './Context';

/**
 * If
 */
export class If extends Context {

    /**
     * condition
     * @protected
     */
    protected _condition: string;

    /**
     * constructor
     * @param condition
     */
    public constructor(condition: string) {
        super(ContextNames.if);

        this._condition = condition;
    }

    /**
     * generate
     * @param index
     */
    public generate(index: number = 0): string {
        let buffer = this._createContent(`${this._name} (${this._condition}) {`, index);

        buffer += this._generateStr(index);

        return buffer + this._createContent('}', index);
    }

}