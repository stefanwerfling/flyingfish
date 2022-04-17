import {Sidebar} from './Sidebar/Sidebar';
import {SidebarLogo} from './Sidebar/SidebarLogo';

export class MainSidebar {

    private _element: any;

    private _logo: SidebarLogo;
    private _sidebar: Sidebar;

    public constructor(element?: any) {
        if (element) {
            this._element = element;
        } else {
            this._element = jQuery('.main-sidebar');
        }

        if (this._element.length === 0) {
            throw Error('main sidebar element not found!');
        }

        const l = jQuery('<a href="#" class="brand-link"/>').appendTo(this._element);
        this._logo = new SidebarLogo(l);

        const s = jQuery('<div class="sidebar" />').appendTo(this._element);
        this._sidebar = new Sidebar(s);
    }

    public getLogo(): SidebarLogo {
        return this._logo;
    }

    public getSidebar(): Sidebar {
        return this._sidebar;
    }

}