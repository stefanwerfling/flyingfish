import {Element} from '../../Element';

/**
 * Card
 */
export class Card extends Element {

    private _header: any;
    private _title: any;
    private _tools: any;
    private _body: any;
    private _overload: any;

    public constructor(elementObject: Element) {
        super();

        this._element = jQuery('<div class="card" />').appendTo(elementObject.getElement());
        this._header = jQuery('<div class="card-header"/>').appendTo(this._element);
        this._title = jQuery('<h3 class="card-title"/>').appendTo(this._header);
        this._tools = jQuery('<div class="card-tools"/>').appendTo(this._header);
        this._body = jQuery('<div class="card-body table-responsive p-0" />').appendTo(this._element);
        this._overload = jQuery('<div class="overlay"><i class="fas fa-2x fa-sync-alt fa-spin"></i></div>').appendTo(this._element);
        this.hideLoading();
    }

    public setTitle(title: string): void {
        this._title.empty().append(title);
    }

    public getToolsElement(): any {
        return this._tools;
    }

    public getElement(): any {
        return this._body;
    }

    public showLoading(): void {
        this._overload.show();
    }

    public hideLoading(): void {
        this._overload.hide();
    }

}