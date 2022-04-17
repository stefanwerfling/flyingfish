import {Element} from '../../Element';

/**
 * DescriptionBlockBorder
 */
export enum DescriptionBlockBorder {
    none = '',
    right = 'border-right'
}

/**
 * DescriptionBlock
 */
export class DescriptionBlock extends Element {

    /**
     * h5
     * @protected
     */
    protected _h5: any;

    /**
     * span
     * @protected
     */
    protected _span: any;

    /**
     * constructor
     * @param element
     * @param border
     */
    public constructor(element: any, border: DescriptionBlockBorder = DescriptionBlockBorder.right) {
        super();

        this._element = jQuery(`<div class="description-block ${border}" />`).appendTo(element);
        this._h5 = jQuery('<h5 class="description-header" />').appendTo(this._element);
        this._span = jQuery('<span class="description-text" />').appendTo(this._element);
    }

    /**
     * setHeader
     * @param str
     */
    public setHeader(str: string): void {
        this._h5.empty().append(str);
    }

    /**
     * setText
     * @param str
     */
    public setText(str: string): void {
        this._span.empty().append(str);
    }

    /**
     * getTextElement
     */
    public getTextElement(): any {
        return this._span;
    }

}