import {Element} from '../../Element';

/**
 * InputType
 */
export enum InputType {
    text = 'text',
    number = 'number',
    range = 'range',
}

/**
 * InputBottemBorderOnly2
 */
export class InputBottemBorderOnly2 extends Element {

    /**
     * constructor
     * @param element
     * @param id
     * @param type
     */
    public constructor(element: any, id?: string, type: InputType = InputType.text) {
        super();

        let aid: string = '';

        if (!id) {
            aid = id!;
        }

        this._element = jQuery(`<input type="${type}" class="form-control form-control-border border-width-2" id="${aid}" placeholder="">`).appendTo(element);
    }

    /**
     * setValue
     * @param value
     */
    public setValue(value: string): void {
        this._element.val(value);
    }

    /**
     * getValue
     */
    public getValue(): string {
        return this._element.val();
    }

}