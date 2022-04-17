import {Content} from './Content';
import {ContentHeader} from './ContentHeader';

export class ContentWrapper {

    private _element: any;

    private _contentHeader: ContentHeader;
    private _content: Content;


    public constructor(element?: any) {
        if (element) {
            this._element = element;
        } else {
            this._element = jQuery('.content-wrapper');
        }

        if (this._element.length === 0) {
            throw Error('content wrapper element not found!');
        }

        const ch = jQuery('<div class="content-header" />').appendTo(this._element);
        this._contentHeader = new ContentHeader(ch);

        const c = jQuery('<section class="content" />').appendTo(this._element);
        this._content = new Content(c);
    }

    public getElement(): any {
        return this._element;
    }

    public getContentHeader(): ContentHeader {
        return this._contentHeader;
    }

    public getContent(): Content {
        return this._content;
    }

}