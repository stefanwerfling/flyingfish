import {LeftNavbar} from './LeftNavbar';

/**
 * Link Function call
 */
type LeftNavbarLinkFn = (event: any) => void;

/**
 * LeftNavbarLink
 */
export class LeftNavbarLink {

    /**
     * list element
     * @private
     */
    private _liElement: any;

    /**
     * link element
     * @private
     */
    private _aElement: any;

    /**
     * constructor
     * @param leftNavbar
     * @param title
     * @param onClickFn
     * @param linkClass
     */
    public constructor(leftNavbar: LeftNavbar, title: string, onClickFn?: LeftNavbarLinkFn|null, linkClass: string = '') {
        this._liElement = jQuery('<li class="nav-item d-none d-sm-inline-block" />').appendTo(leftNavbar.getElement());
        this._aElement = jQuery(`<a href="#" class="nav-link ${linkClass}">${title}</a>`).appendTo(this._liElement);

        if (onClickFn) {
            this._aElement.on('click', onClickFn);
        } else if (onClickFn !== null) {
            this._aElement.on('click', () => {
                return false;
            });
        }
    }

    /**
     * getLiElement
     */
    public getLiElement(): any {
        return this._liElement;
    }

    /**
     * getAElement
     */
    public getAElement(): any {
        return this._aElement;
    }

}