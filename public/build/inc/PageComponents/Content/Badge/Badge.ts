import {Element} from '../../Element';

/**
 * BadgeType
 */
export enum BadgeType {
    success = 'badge-success',
    warning = 'badge-warning',
    danger = 'badge-danger',
    info = 'badge-info'
}

/**
 * Badge
 */
export class Badge extends Element {

    /**
     * constructor
     * @param element
     * @param text
     * @param type
     */
    public constructor(element: any, text: string, type: BadgeType = BadgeType.success) {
        super();

        this._element = jQuery(`<span class="badge ${type}">${text}</span>`).appendTo(element);
    }

}