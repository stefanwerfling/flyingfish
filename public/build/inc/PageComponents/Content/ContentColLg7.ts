import {Element} from '../Element';
import {ContentRow} from './ContentRow';

/**
 * ContentColLg7
 */
export class ContentColLg7 extends Element {

    public constructor(contentRow: ContentRow) {
        super();

        this._element = jQuery('<div class="col-lg-7" />').appendTo(contentRow.getElement());
    }

}