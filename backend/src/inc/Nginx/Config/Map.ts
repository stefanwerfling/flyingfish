import {Context, ContextNames} from './Context.js';

/**
 * Map
 */
export class Map extends Context {

    /**
     * source variable
     * @protected
     */
    protected _sourceVar: string;

    /**
     * destination variable
     * @protected
     */
    protected _destinationVar: string;

    /**
     * constructor
     * @param sourceVar
     * @param destinationVar
     */
    public constructor(sourceVar: string, destinationVar: string) {
        super(ContextNames.map);

        this._sourceVar = sourceVar;
        this._destinationVar = destinationVar;
    }

    /**
     * getSourceVar
     */
    public getSourceVar(): string {
        return this._sourceVar;
    }

    /**
     * getDestinationVar
     */
    public getDestinationVar(): string {
        return this._destinationVar;
    }

    /**
     * generate
     * @param index
     */
    public generate(index: number = 0): string {
        let buffer = this._createContent(`${this._name} ${this._sourceVar} ${this._destinationVar} {`, index);

        buffer += this._generateStr(index);

        return buffer + this._createContent('}', index);
    }

}