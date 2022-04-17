/**
 * RightNavbar
 */
export class RightNavbar {

    private _element: any;

    /**
     * constructor
     * @param element
     */
    public constructor(element?: any) {
        if (element) {
            this._element = jQuery('<ul class="navbar-nav ml-auto" />').appendTo(element);
        } else {
            throw Error('right navbar element not found!');
        }
    }

    /**
     * getElement
     */
    public getElement(): any {
        return this._element;
    }

}