import {LeftNavbar} from './LeftNavbar';

type LeftNavbarLinkFn = (event: any) => void;

export class LeftNavbarLink {

    private _liElement: any;
    private _aElement: any;

    public constructor(leftNavbar: LeftNavbar, title: string, onClickFn?: LeftNavbarLinkFn|null) {
        this._liElement = jQuery('<li class="nav-item d-none d-sm-inline-block" />').appendTo(leftNavbar.getElement());
        this._aElement = jQuery(`<a href="#" class="nav-link">${title}</a>`).appendTo(this._liElement);

        if (onClickFn) {
            this._aElement.on('click', onClickFn);
        } else if (onClickFn !== null) {
            this._aElement.on('click', () => {
                return false;
            });
        }
    }

    public getLiElement(): any {
        return this._liElement;
    }

    public getAElement(): any {
        return this._aElement;
    }

}