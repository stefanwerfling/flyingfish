import {Form} from '../../Bambooo/Content/Form/Form';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {InputBottemBorderOnly2, InputType} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {Switch} from '../../Bambooo/Content/Form/Switch';
import {Element} from '../../Bambooo/Element';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * IpAccessWhitelistModalButtonClickFn
 */
type IpAccessWhitelistModalButtonClickFn = () => void;

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
     * switch disable
     * @protected
     */
    protected _switchDisable: Switch;

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

        const groupDisable = new FormGroup(form, 'Disable this ip access');
        this._switchDisable = new Switch(groupDisable, 'ipownaccessdisable');

        const groupDescription = new FormGroup(bodyCard, 'Description');
        this._inputDescription = new InputBottemBorderOnly2(groupDescription);

        jQuery('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>').appendTo(this._footer);
        const btnSave = jQuery('<button type="button" class="btn btn-primary">Save</button>').appendTo(this._footer);

        btnSave.on('click', (): void => {
            if (this._onSaveClick !== null) {
                this._onSaveClick();
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
    public resetValues(): void {
        this.setId(null);
        this.setIp('');
        this.setDisable(false);
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