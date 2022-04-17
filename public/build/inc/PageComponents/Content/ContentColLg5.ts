import {Element} from '../Element';
import {ContentRow} from './ContentRow';

/**
 * ContentColLg5
 */
export class ContentColLg5 extends Element {

    public constructor(contentRow: ContentRow) {
        super();

        this._element = jQuery('<div class="col-lg-5" />').appendTo(contentRow.getElement());
    }

}