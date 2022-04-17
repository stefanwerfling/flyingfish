import {Element} from '../../Element';

enum CalloutType {
    warning = 'callout-warning',
    danger = 'callout-danger',
    info = 'callout-info',
    success = 'callout-success',
    default = ''
}

/**
 * Callout
 */
export class Callout extends Element {

    protected _mainElement: any;
    protected _title: any;

    /**
     * constructor
     * @param element
     * @param type
     */
    public constructor(element: any, type: CalloutType = CalloutType.info) {
        super();

        this._mainElement = jQuery(`<div class="callout ${type}" />`).appendTo(element);
        this._title = jQuery('<h5/>').appendTo(this._mainElement);
        this._element = jQuery('<p/>').appendTo(this._mainElement);
    }

    /**
     * setTitle
     * @param title
     */
    public setTitle(title: string): void {
        this._title.empty().append(title);
    }

    /**
     * getMainElement
     */
    public getMainElement(): any {
        return this._mainElement;
    }

}