import {Element} from '../../Element';

/**
 * FormGroup
 */
export class FormGroup extends Element {

    protected _label: any;

    /**
     * constructor
     * @param element
     * @param label
     */
    public constructor(element: any, label?: any) {
        super();

        this._element = jQuery('<div class="form-group" />').appendTo(element);
        this._label = jQuery('<label/>').appendTo(this._element);

        if (label) {
            this.setLabel(label);
        }
    }

    /**
     * setLabel
     * @param label
     */
    public setLabel(label: any): void {
        this._label.empty().append(label);
    }

}