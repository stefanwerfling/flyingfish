import {BadgeType, FormGroup, FormRow, Switch, InputBottemBorderOnly2, InputType, SelectBottemBorderOnly2,
    Element, ModalDialog, ModalDialogType} from 'bambooo';

/**
 * DomainRecordEditModalButtonClickFn
 */
type DomainRecordEditModalButtonClickFn = () => void;

/**
 * DomainRecordEditModal
 */
export class DomainRecordEditModal extends ModalDialog {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * domain id
     * @protected
     */
    protected _domainId: number|null = null;

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
     * select class
     * @protected
     */
    protected _selectClass: SelectBottemBorderOnly2;

    /**
     * input name
     * @protected
     */
    protected _inputTTL: InputBottemBorderOnly2;

    /**
     * input value
     * @protected
     */
    protected _inputValue: InputBottemBorderOnly2;

    /**
     * switch update by dyn dns client
     * @protected
     */
    protected _switchUByDynDnsClient: Switch;

    /**
     * click save fn
     * @protected
     */
    protected _onSaveClick: DomainRecordEditModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'domainrecordmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);
        const groupName = new FormGroup(bodyCard, 'Domainname');
        this._inputName = new InputBottemBorderOnly2(groupName.getElement());
        this._inputName.setReadOnly(true);

        const rowTP = new FormRow(bodyCard);

        const groupType = new FormGroup(rowTP.createCol(4), 'Type');
        this._selectType = new SelectBottemBorderOnly2(groupType.getElement());
        this._selectType.addValue({
            key: '1',
            value: 'A',
            style: `background:${BadgeType.color_cream_red};`
        });

        this._selectType.addValue({
            key: '2',
            value: 'NS',
            style: `background:${BadgeType.color_cream_blue};`
        });

        this._selectType.addValue({
            key: '5',
            value: 'CNAME',
            style: `background:${BadgeType.color_cream_green};`
        });

        this._selectType.addValue({
            key: '15',
            value: 'MX',
            style: `background:${BadgeType.color_cream_yellow};`
        });

        this._selectType.addValue({
            key: '16',
            value: 'TXT',
            style: `background:${BadgeType.color_cream_purpel};`
        });

        this._selectType.addValue({
            key: '17',
            value: 'AAAA',
            style: `background:${BadgeType.color_cream_rorange};`
        });

        const groupClass = new FormGroup(rowTP.createCol(4), 'Class');
        this._selectClass = new SelectBottemBorderOnly2(groupClass.getElement());
        this._selectClass.addValue({
            key: '1',
            value: 'IN'
        });

        const groupTTL = new FormGroup(rowTP.createCol(4), 'Time to Live');
        this._inputTTL = new InputBottemBorderOnly2(groupTTL.getElement(), undefined, InputType.number);
        this._inputTTL.setValue('300');

        const groupValue = new FormGroup(bodyCard, 'Value');
        this._inputValue = new InputBottemBorderOnly2(groupValue.getElement());

        const rowOpt = new FormRow(bodyCard);
        const groupDnyDnsClient = new FormGroup(rowOpt.createCol(6), 'Update by DynDns Client');
        this._switchUByDynDnsClient = new Switch(groupDnyDnsClient, 'ubydnsclient');

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
     * getDomainId
     */
    public getDomainId(): number|null {
        return this._domainId;
    }

    /**
     * setDomainId
     * @param id
     */
    public setDomainId(id: number|null): void {
        this._domainId = id;
    }

    /**
     * setDomainName
     * @param name
     */
    public setDomainName(name: string): void {
        this._inputName.setValue(name);
    }

    /**
     * setType
     * @param type
     */
    public setType(type: string): void {
        this._selectType.setSelectedValue(type);
    }

    /**
     * getType
     */
    public getType(): string {
        return this._selectType.getSelectedValue();
    }

    /**
     * setClass
     * @param aclass
     */
    public setClass(aclass: string): void {
        this._selectClass.setSelectedValue(aclass);
    }

    /**
     * getClass
     */
    public getClass(): string {
        return this._selectClass.getSelectedValue();
    }

    /**
     * setTTL
     * @param ttl
     */
    public setTTL(ttl: string): void {
        this._inputTTL.setValue(ttl);
    }

    /**
     * getTTL
     */
    public getTTL(): string {
        return this._inputTTL.getValue();
    }

    /**
     * setValue
     * @param value
     */
    public setValue(value: string): void {
        this._inputValue.setValue(value);
    }

    /**
     * getValue
     */
    public getValue(): string {
        return this._inputValue.getValue();
    }

    /**
     * setUpdateByDynDnsClient
     * @param update
     */
    public setUpdateByDynDnsClient(update: boolean): void {
        this._switchUByDynDnsClient.setEnable(update);
    }

    /**
     * getUpdateByDynDnsClient
     */
    public getUpdateByDynDnsClient(): boolean {
        return this._switchUByDynDnsClient.isEnable();
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setDomainId(null);
        this.setDomainName('');
        this.setType('1');
        this.setClass('1');
        this.setTTL('300');
        this.setValue('');
        this.setUpdateByDynDnsClient(false);
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: DomainRecordEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}