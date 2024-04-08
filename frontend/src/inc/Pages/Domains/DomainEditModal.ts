import {InputBottemBorderOnly2, FormGroup, Switch, Element, ModalDialog, ModalDialogType} from 'bambooo';

/**
 * DomainEditModalButtonClickFn
 */
type DomainEditModalButtonClickFn = () => Promise<void>;

/**
 * DomainEditModal
 */
export class DomainEditModal extends ModalDialog {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input name
     * @protected
     */
    protected _inputName: InputBottemBorderOnly2;

    /**
     * switch disable
     * @protected
     */
    protected _switchDisable: Switch;

    /**
     * click save fn
     * @protected
     */
    protected _onSaveClick: DomainEditModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'domainmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupName = new FormGroup(bodyCard, 'Domainname');
        this._inputName = new InputBottemBorderOnly2(groupName.getElement());
        this._inputName.setPlaceholder('mydomain.com');

        const groupDisable = new FormGroup(bodyCard, 'Disable this Domain');
        this._switchDisable = new Switch(groupDisable, 'domaindisable');

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
     * getName
     */
    public getName(): string {
        return this._inputName.getValue();
    }

    /**
     * setName
     * @param name
     */
    public setName(name: string): void {
        this._inputName.setValue(name);
    }

    /**
     * setDisable
     * @param disable
     */
    public setDisable(disable: boolean): void {
        this._switchDisable.setEnable(disable);
    }

    /**
     * getDisable
     */
    public getDisable(): boolean {
        return this._switchDisable.isEnable();
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this.setId(null);
        this.setName('');
        this.setDisable(false);
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: DomainEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}