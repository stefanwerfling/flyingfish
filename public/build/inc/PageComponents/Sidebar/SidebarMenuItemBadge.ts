import {SidebarMenuItem} from './SidebarMenuItem';

export class SidebarMenuItemBadge {

    protected _span: any;

    /**
     * constructor
     * @param sidebarMenuItem
     */
    public constructor(sidebarMenuItem: SidebarMenuItem) {
        this._span = jQuery('<span class="badge badge-info right" />').appendTo(sidebarMenuItem.getPElement());
    }

    public setContent(content: any): void {
        this._span.empty().append(content);
    }

}