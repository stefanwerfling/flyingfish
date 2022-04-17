import {Content} from '../Content';

export class ContentRow {

    private _element: any;

    public constructor(content: Content) {
        this._element = jQuery('<div class="row" />').appendTo(content.getContentFluidElement());
    }

    public getElement(): any {
        return this._element;
    }

}