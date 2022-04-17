import {LeftNavbar} from './Navbar/LeftNavbar';
import {RightNavbar} from './Navbar/RightNavbar';

/**
 * Navbar
 */
export class Navbar {

    private _element: any;

    private _leftNavbar: LeftNavbar;
    private _rightNavbar: RightNavbar|null = null;

    /**
     * constructor
     * @param element
     */
    public constructor(element?: any) {
        if (element) {
            this._element = element;
        } else {
            throw Error('navbar element not found!');
        }

        this._leftNavbar = new LeftNavbar(this._element);
    }

    /**
     * getLeftNavbar
     */
    public getLeftNavbar(): LeftNavbar {
        return this._leftNavbar;
    }

    /**
     * getRightNavbar
     */
    public getRightNavbar(): RightNavbar {
        if (this._rightNavbar === null) {
            this._rightNavbar = new RightNavbar(this._element);
        }

        return this._rightNavbar;
    }

}