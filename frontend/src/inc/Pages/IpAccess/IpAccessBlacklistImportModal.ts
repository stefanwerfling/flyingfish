import {Form, FormGroup, Switch, Element, ModalDialog, ModalDialogType} from 'bambooo';

/**
 * IpAccessBlacklistImportModalButtonClickFn
 */
type IpAccessBlacklistImportModalButtonClickFn = () => Promise<void>;

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
     * click save fn
     * @protected
     */
    protected _onSaveClick: IpAccessBlacklistImportModalButtonClickFn|null = null;

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

        jQuery('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>').appendTo(this._footer);
        const btnSave = jQuery('<button type="button" class="btn btn-primary">Save</button>').appendTo(this._footer);

        btnSave.on('click', async(): Promise<void> => {
            if (this._onSaveClick !== null) {
                this.showLoading();
                await this._onSaveClick();
                this.hideLoading();
            }
        });
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
    public resetValues(): void {
        this.setId(null);
        this.setDisabled(false);
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: IpAccessBlacklistImportModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}