import {Element} from '../Element';

export enum ModalDialogType {
    small = 'modal-sm',
    large = 'modal-lg',
    xlarge = 'modal-xl'
}

/**
 * ModalDialog
 */
export class ModalDialog extends Element {

    protected _mainElement: any;
    protected _innerElement: any;
    protected _modalContent: any;

    protected _header: any;
    protected _header_title: any;
    protected _header_button: any;

    protected _body: any;

    protected _footer: any;

    /**
     * constructor
     * @param elementObject
     * @param idname
     * @param modalType
     */
    public constructor(elementObject: Element, idname: string, modalType: ModalDialogType) {
        super();

        this._mainElement = jQuery(`<div class="modal fade" id="${idname}" />`).appendTo(elementObject.getElement());
        this._innerElement = jQuery(`<div class="modal-dialog ${modalType}" />`).appendTo(this._mainElement);
        this._modalContent = jQuery('<div class="modal-content">').appendTo(this._innerElement);

        this._header = jQuery('<div class="modal-header"/>').appendTo(this._modalContent);
        this._header_title = jQuery('<h4 class="modal-title" />').appendTo(this._header);
        this._header_button = jQuery(
            '<button type="button" class="close" data-dismiss="modal" aria-label="Close">' +
            '<span aria-hidden="true">×</span>' +
            '</button>'
        ).appendTo(this._header);

        this._body = jQuery('<div class="modal-body" />').appendTo(this._modalContent);

        this._footer = jQuery('<div class="modal-footer justify-content-between">').appendTo(this._modalContent);
    }

    /**
     * setTitle
     * @param title
     */
    public setTitle(title: string): void {
        this._header_title.empty().append(title);
    }

    /**
     * getBody
     */
    public getBody(): any {
        return this._body;
    }

    /**
     * getFooter
     */
    public getFooter(): any {
        return this._footer;
    }

    /**
     * show
     */
    public show(): void {
        this._mainElement.modal('show');
    }

    /**
     * hide
     */
    public hide(): void {
        this._mainElement.modal('hide');
    }

}