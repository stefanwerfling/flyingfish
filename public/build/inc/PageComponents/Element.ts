
export class Element {

    protected _element: any;

    public constructor(aelement?: any) {
        if (aelement) {
            this._element = aelement;
        }
    }

    public getElement(): any {
        return this._element;
    }

}