import {Element} from './Element';

export class Content extends Element {

    private _contentFluidElement: any;

    public constructor(element?: any) {
        super();

        if (element) {
            this._element = element;
        } else {
            this._element = jQuery('.content-wrapper');
        }

        if (this._element.length === 0) {
            throw Error('content element not found!');
        }

        this._contentFluidElement = jQuery('<div class="container-fluid"/>').appendTo(this._element);
    }

    public getContentFluidElement(): any {
        return this._contentFluidElement;
    }

    public empty(): void {
        this._contentFluidElement.empty();
    }

}