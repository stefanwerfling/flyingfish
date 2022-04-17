import {Element} from '../../Element';

/**
 * ButtonGroup
 */
export class ButtonGroup extends Element {

    /**
     * constructor
     * @param element
     */
    public constructor(element: any) {
        super();

        this._element = jQuery('<div class="btn-group" />').appendTo(element);
    }

}