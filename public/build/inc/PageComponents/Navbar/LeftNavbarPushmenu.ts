import {LeftNavbar} from './LeftNavbar';

export class LeftNavbarPushmenu {

    private _li: any;

    public constructor(leftNavbar: LeftNavbar) {
        this._li = jQuery('<li class="nav-item" />').appendTo(leftNavbar.getElement());
        jQuery('<a class="nav-link" data-widget="pushmenu" href="#" role="button"><i class="fas fa-bars"></i></a>').appendTo(this._li);
    }

    public getLiElement(): any {
        return this._li;
    }

}