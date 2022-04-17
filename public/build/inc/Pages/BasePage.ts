import {LeftNavbarPushmenu} from '../PageComponents/Navbar/LeftNavbarPushmenu';
import {Wrapper} from '../PageComponents/Wrapper';

// eslint-disable-next-line no-use-before-define
type loadPageFn = (apage: BasePage) => void;

/**
 * BasePage
 */
export class BasePage {

    private TITLE: string = 'FlyingFish';
    private LOGO: string = 'images/icons/icon-144x144.png';

    protected _wrapper = new Wrapper();

    protected _name: string = 'base';

    protected _loadPageFn: loadPageFn | null = null;

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