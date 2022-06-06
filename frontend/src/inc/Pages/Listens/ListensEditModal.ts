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

        const groupType = new FormGroup(rowTP.createCol(6), 'Type');
        this._selectType = new SelectBottemBorderOnly2(groupType.getElement());
        this._selectType.addValue({
            key: `${ListenTypes.stream}`,
            value: 'Stream',
            style: 'background:#ffc107;'
        });

        this._selectType.addValue({
            key: `${ListenTypes.http}`,
            value: 'HTTP/HTTPS',
            style: 'background:#28a745;'
        });

        const groupPort = new FormGroup(rowTP.createCol(6), 'Port');
        this._inputPort = new InputBottemBorderOnly2(groupPort.getElement(), InputType.number);
        this._inputPort.setPlaceholder('80');

        const groupDescription = new FormGroup(bodyCard, 'Description');
        this._inputDescription = new InputBottemBorderOnly2(groupDescription.getElement());
        this._inputDescription.setPlaceholder('A description ...');

        const rowOptions = new FormRow(bodyCard);
        const groupIP6 = new FormGroup(rowOptions.createCol(6), 'IP6');
        this._switchIp6 = new Switch(groupIP6.getElement(), 'ip6');

        jQuery('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>').appendTo(this._footer);
        const btnSave = jQuery('<button type="button" class="btn btn-primary">Save changes</button>').appendTo(this._footer);

        btnSave.on('click', (): void => {
            if (this._onSaveClick !== null) {
                this._onSaveClick();
            }
        });
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
     * resetValues
     */
    public resetValues(): void {

    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: ListensEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}