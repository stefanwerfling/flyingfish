import {Form, FormGroup, InputBottemBorderOnly2, InputType, Switch, Element, ModalDialog, ModalDialogType} from 'bambooo';

/**
 * IpAccessWhitelistModalButtonClickFn
 */
type IpAccessWhitelistModalButtonClickFn = () => Promise<void>;

/**
 * IpAccessWhitelistModal
 */
export class IpAccessWhitelistModal extends ModalDialog {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input ip
     * @protected
     */
    protected _inputIp: InputBottemBorderOnly2;

    /**
     * switch disabled
     * @protected
     */
    protected _switchDisabled: Switch;

    /**
     * input description
     * @protected
     */
    protected _inputDescription: InputBottemBorderOnly2;

    /**
     * click save fn
     * @protected
     */
    protected _onSaveClick: IpAccessWhitelistModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'ipaccesswhitelistdialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"></div>').appendTo(this._body);
        const form = new Form(bodyCard);

        const groupIp = new FormGroup(form, 'IP');
        this._inputIp = new InputBottemBorderOnly2(groupIp, 'ip', InputType.text);

        const groupDisable = new FormGroup(form, 'Disabled this ip access');
        this._switchDisabled = new Switch(groupDisable, 'ipownaccessdisable');

        const groupDescription = new FormGroup(bodyCard, 'Description');
        this._inputDescription = new InputBottemBorderOnly2(groupDescription);

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
     * getIp
     */
    public getIp(): string {
        return this._inputIp.getValue();
    }

    /**
     * setIp
     * @param ip
     */
    public setIp(ip: string): void {
        this._inputIp.setValue(ip);
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
     * setDescription
     * @param description
     */
    public setDescription(description: string): void {
        this._inputDescription.setValue(description);
    }

    /**
     * getDescription
     */
    public getDescription(): string {
        return this._inputDescription.getValue();
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this.setId(null);
        this.setIp('');
        this.setDisabled(false);
        this.setDescription('');
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: IpAccessWhitelistModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}