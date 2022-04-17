import {SidebarMenu} from './SidebarMenu';
import {SidebarMenuTree} from './SidebarMenuTree';

type SidebarMenuItemClickFn = (event: any) => void;

/**
 * SidebarMenuItem
 */
export class SidebarMenuItem {

    private readonly _liElement: any;
    private readonly _aElement: any;
    private readonly _iElement: any;
    private readonly _pElement: any;

    private _name: string = 'unknow';
    private _iconClass: string = 'fa-circle';

    /**
     * constructor
     * @param sidebar
     */
    public constructor(sidebar: SidebarMenu|SidebarMenuTree) {
        this._liElement = jQuery('<li class="nav-item" />').appendTo(sidebar.getUlElement());
        this._aElement = jQuery('<a href="#" class="nav-link" />').appendTo(this._liElement);
        this._iElement = jQuery('<i />').appendTo(this._aElement);
        this._iElement.addClass(`nav-icon fas ${this._iconClass}`);
        this._pElement = jQuery('<p />').appendTo(this._aElement);

        sidebar.addMenuItem(this);
    }

    /**
     * setSymbolColor
     * @param acolor
     */
    public setSymbolColor(acolor: string): void {
        this._iElement.css({
            color: acolor
        });
    }

    /**
     * setActiv
     * @param activ
     */
    public setActiv(activ: boolean): void {
        this._aElement.removeClass().addClass('nav-link');

        if (activ) {
            this._aElement.addClass('active');
        }
    }

    /**
     * setIconClass
     * @param iconClass
     */
    public setIconClass(iconClass: string): void {
        this._iconClass = iconClass;
        this._iElement.removeClass().addClass(`nav-icon fas ${this._iconClass}`);
    }

    /**
     * setTitle
     * @param title
     */
    public setTitle(title: string): void {
        this._pElement.empty().append(title);
    }

    /**
     * setClick
     * @param onClickFn
     */
    public setClick(onClickFn: SidebarMenuItemClickFn): void {
        this._aElement.unbind().on('click', onClickFn);
    }

    /**
     * getLiElement
     */
    public getLiElement(): any {
        return this._liElement;
    }

    /**
     * getPElement
     */
    public getPElement(): any {
        return this._pElement;
    }

    /**
     * setName
     * @param name
     */
    public setName(name: string): void {
        this._name = name;
    }

    /**
     * getName
     */
    public getName(): string {
        return this._name;
    }

}