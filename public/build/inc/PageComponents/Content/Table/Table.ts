import {Element} from '../../Element';

export class Table extends Element {

    private _thead: any;
    private _tbody: any;
    private _tfoot: any = null;

    public constructor(element: any) {
        super();

        this._element = jQuery('<table class="table table-hover text-nowrap"/>').appendTo(element);
        this._thead = jQuery('<thead />').appendTo(this._element);
        this._tbody = jQuery('<tbody />').appendTo(this._element);
    }

    public getThead(): any {
        return this._thead;
    }

    public getTbody(): any {
        return this._tbody;
    }

    public getFoot(): any {
        if (this._tfoot === null) {
            this._tfoot = jQuery('<tfoot />').appendTo(this._element);
        }

        return this._tfoot;
    }

}