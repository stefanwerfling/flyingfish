import {Element} from '../Element';

/**
 * NavbarLinkFullsize
 */
export class NavbarLinkFullsize extends Element {

    /**
     * constructor
     * @param element
     */
    public constructor(element: any) {
        super();

        this._element = jQuery('<li class="nav-item" />').appendTo(element);
        const a = jQuery('<a class="nav-link" data-widget="fullscreen" href="#" role="button" />').appendTo(this._element);
        jQuery('<i class="fas fa-expand-arrows-alt" />').appendTo(a);
    }

}