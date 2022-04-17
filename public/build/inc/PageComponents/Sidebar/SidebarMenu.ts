import {Sidebar} from './Sidebar';
import {SidebarMenuItem} from './SidebarMenuItem';

export class SidebarMenu {

    private _navElement: any;
    private _ulElement: any;

    private _items: SidebarMenuItem[] = [];

    public constructor(sidebar: Sidebar) {
        this._navElement = jQuery('<nav class="mt-2" />').appendTo(sidebar.getElement());
        this._ulElement = jQuery('<ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false" />').appendTo(this._navElement);
    }

    public getNavElement(): any {
        return this._navElement;
    }

    public getUlElement(): any {
        return this._ulElement;
    }

    public addMenuItem(menuItem: SidebarMenuItem): void {
        this._items.push(menuItem);
    }

    public getMenuItem(name: string): SidebarMenuItem|null {
        for (const item of this._items) {
            if (item.getName() === name) {
                return item;
            }
        }

        return null;
    }

}