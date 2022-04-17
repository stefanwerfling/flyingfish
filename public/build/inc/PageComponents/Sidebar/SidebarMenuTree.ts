import {SidebarMenuItem} from './SidebarMenuItem';

/**
 * SidebarMenuTree
 */
export class SidebarMenuTree {

    private _ulElement: any;

    private _items: SidebarMenuItem[] = [];

    /**
     * constructor
     * @param sidebarMenuItem
     */
    public constructor(sidebarMenuItem: SidebarMenuItem) {
        const pelement = jQuery(sidebarMenuItem.getPElement());

        pelement.find('i').remove();
        pelement.append(jQuery('<i class="fas fa-angle-left right" />'));

        this._ulElement = jQuery('<ul class="nav nav-treeview" style="display: block;" />').appendTo(sidebarMenuItem.getLiElement());
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