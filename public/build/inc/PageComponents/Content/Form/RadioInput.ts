import {Element} from '../../Element';

/**
 * RadioInput
 */
export class RadioInput extends Element {

    /**
     * input radio
     * @protected
     */
    protected _inputRadio: any;

    /**
     * input
     * @protected
     */
    protected _input: any;

    /**
     * constructor
     * @param element
     * @param radionName
     * @param radioValue
     * @param nameInput
     * @param nameInputValue
     * @param checked
     */
    public constructor(element: any, radionName: string, radioValue: string, nameInput: string, inputValue: string, checked: boolean = false) {
        super();

        this._element = jQuery('<div class="input-group" />').appendTo(element);

        const prependGroup = jQuery('<div class="input-group-prepend" />').appendTo(this._element);
        const spanInputGroup = jQuery('<span class="input-group-text" />').appendTo(prependGroup);
        this._inputRadio = jQuery(`<input type="radio" name="${radionName}" value="${radioValue}" ${checked}>`).appendTo(spanInputGroup);
        this._input = jQuery(`<input type="text" class="form-control" name="${nameInput}" value="${inputValue}">`).appendTo(prependGroup);
    }

}