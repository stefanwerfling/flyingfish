import {Element} from '../../Element';
import {Tr} from './Tr';

/**
 * Td
 */
export class Td extends Element {

    /**
     * constructor
     * @param atr
     * @param avalue
     * @param colspan
     */
    public constructor(atr: Tr, avalue?: any, colspan?: number) {
        super();

        let params = '';

        if (colspan) {
            params = `${params} colspan="${colspan}"`;
        }

        this._element = jQuery(`<td ${params}/>`).appendTo(atr.getElement());

        if (avalue) {
            this.addValue(avalue);
        }
    }

    /**
     * addValue
     * @param avalue
     */
    public addValue(avalue: any): void {
        this._element.append(avalue);
    }

}