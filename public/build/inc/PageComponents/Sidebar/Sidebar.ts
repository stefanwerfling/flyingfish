import {SidebarMenu} from './SidebarMenu';
import {SidebarUserPanel} from './SidebarUserPanel';

export class Sidebar {

    private _element: any;

    private _userPanel: SidebarUserPanel | null = null;

    private _menu: SidebarMenu | null = null;

    public constructor(element?: any) {
        if (element) {
            this._element = element;
        } else {
            throw Error('sidebar element not found!');
        }
    }

    public getMenu(): SidebarMenu {
        if (this._menu === null) {
            this._menu = new SidebarMenu(this);
        }

        return this._menu;
    }

    public getUserPanel(): SidebarUserPanel {
        if (this._userPanel === null) {
            this._userPanel = new SidebarUserPanel(this);
        }

        return this._userPanel;
    }

    public getElement(): any {
        return this._element;
    }

}