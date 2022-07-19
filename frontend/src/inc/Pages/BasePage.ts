import {Wrapper} from '../Bambooo/Wrapper';
import {LeftNavbarPushmenu} from '../Bambooo/Navbar/LeftNavbarPushmenu';

/**
 * loadPageFn
 */
export type loadPageFn = (apage: BasePage) => void;

/**
 * onLoadTable
 */
export type onLoadTable = () => void;

/**
 * BasePage
 */
export class BasePage {

    /**
     * TITLE
     * @private
     */
    private TITLE: string = 'FlyingFish';

    /**
     * LOGO
     * @private
     */
    private LOGO: string = 'images/icons/icon-144x144.png';

    /**
     * wrapper
     * @protected
     */
    protected _wrapper = new Wrapper();

    /**
     * page name
     * @protected
     */
    protected _name: string = 'base';

    /**
     * toast
     * @protected
     */
    protected _toast: any;

    /**
     * load page fn
     * @protected
     */
    protected _loadPageFn: loadPageFn | null = null;

    /**
     * on load table
     * @protected
     */
    protected _onLoadTable: onLoadTable|null = null;

    /**
     * constructor
     */
    public constructor() {
        // eslint-disable-next-line no-new
        new LeftNavbarPushmenu(this._wrapper.getNavbar().getLeftNavbar());

        const preloader = this._wrapper.getPreloader();

        preloader.setTitle(this.TITLE);
        preloader.setImage(this.LOGO);

        const mainSidebar = this._wrapper.getMainSidebar();

        mainSidebar.getLogo().setTitle(this.TITLE);
        mainSidebar.getLogo().setImage(this.LOGO);

        // -------------------------------------------------------------------------------------------------------------

        // @ts-ignore
        this._toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    }

    /**
     * getWrapper
     */
    public getWrapper(): Wrapper {
        return this._wrapper;
    }

    /**
     * getName
     */
    public getName(): string {
        return this._name;
    }

    /**
     * setTitle
     * @param title
     * @protected
     */
    protected setTitle(title: string) {
        this._wrapper.getContentWrapper().getContentHeader().setTitle(title);
    }

    /**
     * setLoadPageFn
     * @param aloadPageFn
     */
    public setLoadPageFn(aloadPageFn: loadPageFn): void {
        this._loadPageFn = aloadPageFn;
    }

    /**
     * loadContent
     */
    public loadContent(): void {
        // load content overwrite
    }

    /**
     * unloadContent
     */
    public unloadContent(): void {
        // unload content overwrite
    }

}