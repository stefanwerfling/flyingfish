import {ListenTypes} from '../../Api/Listen';
import {Switch} from '../../Bambooo/Content/Form/Switch';
import {FormRow} from '../../Bambooo/Content/Form/FormRow';
import {SelectBottemBorderOnly2} from '../../Bambooo/Content/Form/SelectBottemBorderOnly2';
import {InputBottemBorderOnly2, InputType} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {Element} from '../../Bambooo/Element';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * ListensEditModalButtonClickFn
 */
type ListensEditModalButtonClickFn = () => void;

/**
 * ListensEditModal
 */
export class ListensEditModal extends ModalDialog {

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
     * select type
     * @protected
     */
    protected _selectType: SelectBottemBorderOnly2;

    /**
     * select protocol
     * @protected
     */
    protected _selectProtocol: SelectBottemBorderOnly2;

    /**
     * input port
     * @protected
     */
    protected _inputPort: InputBottemBorderOnly2;

    /**
     * input description
     * @protected
     */
    protected _inputDescription: InputBottemBorderOnly2;

    /**
     * switch ip6
     * @protected
     */
    protected _switchIp6: Switch;

    /**
     * switch address check
     * @protected
     */
    protected _switchAddressCheck: Switch;

    /**
     * click save fn
     * @protected
     */
    protected _onSaveClick: ListensEditModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'listenmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupName = new FormGroup(bodyCard, 'Name');
        this._inputName = new InputBottemBorderOnly2(groupName.getElement());
        this._inputName.setPlaceholder('Listenname');

        const rowTP = new FormRow(bodyCard);

        const groupType = new FormGroup(rowTP.createCol(4), 'Type');
        this._selectType = new SelectBottemBorderOnly2(groupType);
        this._selectType.addValue({
            key: `${ListenTypes.stream}`,
            value: 'Stream',
            style: 'background:#ffc107;'
        });

        this._selectType.addValue({
            key: `${ListenTypes.http}`,
            value: 'Http/Https',
            style: 'background:#28a745;'
        });

        const groupProtocol = new FormGroup(rowTP.createCol(4), 'Protocol');
        this._selectProtocol = new SelectBottemBorderOnly2(groupProtocol.getElement());
        this._selectProtocol.addValue({
            key: `0`,
            value: 'TCP'
        });

        this._selectProtocol.addValue({
            key: `1`,
            value: 'UDP'
        });

        this._selectProtocol.addValue({
            key: `2`,
            value: 'TCP & UDP'
        });

        const groupPort = new FormGroup(rowTP.createCol(4), 'Port');
        this._inputPort = new InputBottemBorderOnly2(groupPort, InputType.number);
        this._inputPort.setPlaceholder('80');

        const groupDescription = new FormGroup(bodyCard, 'Description');
        this._inputDescription = new InputBottemBorderOnly2(groupDescription);
        this._inputDescription.setPlaceholder('A description ...');

        const rowOptions = new FormRow(bodyCard);
        const groupIP6 = new FormGroup(rowOptions.createCol(6), 'IP6');
        this._switchIp6 = new Switch(groupIP6.getElement(), 'ip6');

        const groupAC = new FormGroup(rowOptions.createCol(6), 'Address Check');
        this._switchAddressCheck = new Switch(groupAC.getElement(), 'address_check');

        jQuery('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>').appendTo(this._footer);
        const btnSave = jQuery('<button type="button" class="btn btn-primary">Save changes</button>').appendTo(this._footer);

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
     * getType
     */
    public getType(): string {
        return this._selectType.getSelectedValue();
    }

    /**
     * setType
     * @param type
     */
    public setType(type: string): void {
        this._selectType.setSelectedValue(type);
    }

    /**
     * getPort
     */
    public getPort(): string {
        return this._inputPort.getValue();
    }

    /**
     * setPort
     * @param port
     */
    public setPort(port: string): void {
        this._inputPort.setValue(port);
    }

    /**
     * getProtocol
     */
    public getProtocol(): string {
        return this._selectProtocol.getSelectedValue();
    }

    /**
     * setProtocol
     * @param protocol
     */
    public setProtocol(protocol: string): void {
        this._selectProtocol.setSelectedValue(protocol);
    }

    /**
     * getDescription
     */
    public getDescription(): string {
        return this._inputDescription.getValue();
    }

    /**
     * setDescription
     * @param description
     */
    public setDescription(description: string): void {
        this._inputDescription.setValue(description);
    }

    /**
     * getIp6
     */
    public getIp6(): boolean {
        return this._switchIp6.isEnable();
    }

    /**
     * setIp6
     * @param enable
     */
    public setIp6(enable: boolean): void {
        this._switchIp6.setEnable(enable);
    }

    /**
     * getAddressCheck
     */
    public getAddressCheck(): boolean {
        return this._switchAddressCheck.isEnable();
    }

    /**
     * setAddressCheck
     * @param enable
     */
    public setAddressCheck(enable: boolean): void {
        this._switchAddressCheck.setEnable(enable);
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setName('');
        this.setType(`${ListenTypes.stream}`);
        this.setPort('');
        this.setProtocol('0');
        this.setDescription('');
        this.setIp6(false);
        this.setAddressCheck(false);
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: ListensEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}