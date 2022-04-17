import {Element} from '../Element';
import {ContentRow} from './ContentRow';

/**
 * ContentCol12
 */
export class ContentCol12 extends Element {

    public constructor(contentRow: ContentRow) {
        super();

        this._element = jQuery('<div class="col-12" />').appendTo(contentRow.getElement());
    }

}