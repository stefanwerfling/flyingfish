import {Form, FormGroup, Switch, Element, ModalDialog, ModalDialogType, LangText} from 'bambooo';

/**
 * IpAccessBlacklistImportModal
 */
export class IpAccessBlacklistImportModal extends ModalDialog {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * switch disabled
     * @protected
     */
    protected _switchDisabled: Switch;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'ipaccessblacklistimportdialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"></div>').appendTo(this._body);
        const form = new Form(bodyCard);

        const groupDisabled = new FormGroup(form, 'Disabled this ip block');
        this._switchDisabled = new Switch(groupDisabled, 'ipimportblockdisable');

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);
    }

    /**
     * getId
     */
    public getId(): number|null {
        return this._id;
    }

    /**
     * setId
     * @param id
     */
    public setId(id: number|null): void {
        this._id = id;
    }

    /**
     * setDisabled
     * @param disabled
     */
    public setDisabled(disabled: boolean): void {
        this._switchDisabled.setEnable(disabled);
    }

    /**
     * getDisabled
     */
    public getDisabled(): boolean {
        return this._switchDisabled.isEnable();
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this.setId(null);
        this.setDisabled(false);
    }

}