import {Element} from '../../Element';

export enum PTextType {
    success = 'text-success',
    info = 'text-info',
    primary = 'text-primary',
    danger = 'text-danger',
    warning = 'text-warning',
    muted = 'text-muted'
}

/**
 * PText
 */
export class PText extends Element {

    /**
     * constructor
     * @param element
     * @param type
     */
    public constructor(element: any, type: PTextType = PTextType.muted) {
        super();

        this._element = jQuery(`<p class="${type}" />`).appendTo(element);
    }

    /**
     * addValue
     * @param value
     */
    public addValue(value: any): void {
        this._element.append(value);
    }

}