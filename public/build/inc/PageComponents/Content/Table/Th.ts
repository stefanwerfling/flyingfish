import {Element} from '../../Element';
import {Tr} from './Tr';

export class Th extends Element {

    public constructor(atr: Tr, avalue?: any) {
        super();

        this._element = jQuery('<th/>').appendTo(atr.getElement());

        if (avalue) {
            this.addValue(avalue);
        }
    }

    public addValue(avalue: any): void {
        this._element.append(avalue);
    }

}