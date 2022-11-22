import {Context, ContextNames} from './Context.js';

/**
 * Location
 */
export class Location extends Context {

    /**
     * location match
     * @protected
     */
    protected _locationMatch: string;

    /**
     * optional modifier
     * @protected
     */
    protected _optionalModifier: string;

    /**
     * constructor
     * @param locationMatch
     * @param optionalModifier
     */
    public constructor(locationMatch: string, optionalModifier: string = '') {
        super(ContextNames.location);

        this._locationMatch = locationMatch;
        this._optionalModifier = optionalModifier;
    }

    /**
     * generate
     * @param index
     */
    public generate(index: number = 0): string {
        let optionalModifier = '';

        if (this._optionalModifier !== '') {
            optionalModifier = `${this._optionalModifier} `;
        }

        let buffer = this._createContent(`${this._name} ${optionalModifier}${this._locationMatch} {`, index);

        buffer += this._generateStr(index);

        return buffer + this._createContent('}', index);
    }

}