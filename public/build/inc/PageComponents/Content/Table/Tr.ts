import {Element} from '../../Element';

export class Tr extends Element {

    public constructor(element: any) {
        super();

        this._element = jQuery('<tr />').appendTo(element);
    }

}