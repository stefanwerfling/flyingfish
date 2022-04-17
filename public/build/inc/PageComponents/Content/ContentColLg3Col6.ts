import {Element} from '../Element';
import {ContentRow} from './ContentRow';

export class ContentColLg3Col6 extends Element {

    public constructor(contentRow: ContentRow) {
        super();

        this._element = jQuery('<div class="col-lg-3 col-6" />').appendTo(contentRow.getElement());
    }

}