export class ControlSidebar {

    private _element: any;

    public constructor(element?: any) {
        if (element) {
            this._element = element;
        } else {
            this._element = jQuery('.control-sidebar');
        }

        if (this._element.length === 0) {
            throw Error('control sidebar element not found!');
        }
    }

    public getElement(): any {
        return this._element;
    }

}