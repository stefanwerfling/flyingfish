import {ListenAddressCheckType, ListenTypes} from '../../Api/Listen';
import {Switch, FormRow, SelectBottemBorderOnly2, InputBottemBorderOnly2, InputType, FormGroup, Element, NavTab,
    ModalDialog, ModalDialogType, Tooltip, TooltipInfo} from 'bambooo';
import {Lang} from '../../Lang';

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
     * nav tab
     * @protected
     */
    protected _navTab: NavTab;

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
     * select address check type
     * @protected
     */
    protected _selectAddressCheckType: SelectBottemBorderOnly2;

    /**
     * switch proxy protocol
     * @protected
     */
    protected _switchProxyProtocol: Switch;

    /**
     * switch proxy protocol in
     * @protected
     */
    protected _switchProxyProtocolIn: Switch;

    /**
     * switch disable
     * @protected
     */
    protected _switchDisable: Switch;

    /**
     * input stream proxy timeout
     * @protected
     */
    protected _inputStreamProxyTimeout: InputBottemBorderOnly2;

    /**
     * input stream proxy connect timeout
     * @protected
     */
    protected _inputStreamProxyConnectTimeout: InputBottemBorderOnly2;

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

        this._navTab = new NavTab(this._body, 'listenstab');

        const tabDetails = this._navTab.addTab('Details', 'listendetails');

        const tabStreamAdvanced = this._navTab.addTab('Advanced', 'listenstreamadvanced');
        tabStreamAdvanced.tab.hide();

        // details -----------------------------------------------------------------------------------------------------

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(tabDetails.body);

        const groupName = new FormGroup(bodyCard, 'Name');
        this._inputName = new InputBottemBorderOnly2(groupName);
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

        this._selectType.setChangeFn((value) => {
            tabStreamAdvanced.tab.hide();

            switch (value) {
                case `${ListenTypes.stream}`:
                    tabStreamAdvanced.tab.show();
                    break;
            }
        });

        const groupProtocol = new FormGroup(rowTP.createCol(4), 'Protocol');
        this._selectProtocol = new SelectBottemBorderOnly2(groupProtocol);
        this._selectProtocol.addValue({
            key: '0',
            value: 'TCP'
        });

        this._selectProtocol.addValue({
            key: '1',
            value: 'UDP'
        });

        this._selectProtocol.addValue({
            key: '2',
            value: 'TCP & UDP'
        });

        const groupPort = new FormGroup(rowTP.createCol(4), 'Port');
        this._inputPort = new InputBottemBorderOnly2(groupPort, undefined, InputType.number);
        this._inputPort.setPlaceholder('80');

        const groupDescription = new FormGroup(bodyCard, 'Description');
        this._inputDescription = new InputBottemBorderOnly2(groupDescription);
        this._inputDescription.setPlaceholder('A description ...');

        const rowOptions = new FormRow(bodyCard);
        const groupIP6 = new FormGroup(rowOptions.createCol(6), 'IP6 enable');
        this._switchIp6 = new Switch(groupIP6, 'ip6');

        bodyCard.append('<hr>');

        const rowOptionsAc = new FormRow(bodyCard);
        const groupAc = new FormGroup(rowOptionsAc.createCol(6), 'IP access');
        this._switchAddressCheck = new Switch(groupAc, 'address_check');

        const groupAcType = new FormGroup(rowOptionsAc.createCol(6), 'Access type');
        this._selectAddressCheckType = new SelectBottemBorderOnly2(groupAcType);
        this._selectAddressCheckType.addValue({
            key: `${ListenAddressCheckType.black}`,
            value: 'Blacklist'
        });

        this._selectAddressCheckType.addValue({
            key: `${ListenAddressCheckType.white}`,
            value: 'Whitelist'
        });

        bodyCard.append('<hr>');

        const rowProxy = new FormRow(bodyCard);
        const groupProxy = new FormGroup(rowProxy.createCol(6), 'Proxy protocol enable');
        this._switchProxyProtocol = new Switch(groupProxy, 'proxy_protocol');

        const groupProxyIn = new FormGroup(rowProxy.createCol(6), 'Proxy protocol incoming enable');
        this._switchProxyProtocolIn = new Switch(groupProxyIn, 'proxy_protocol_in');

        bodyCard.append('<hr>');

        const groupDisable = new FormGroup(bodyCard, 'Disable this listen');
        this._switchDisable = new Switch(groupDisable, 'disablelisten');

        // stream advanced ---------------------------------------------------------------------------------------------

        const bodyCardAdv = jQuery('<div class="card-body"/>').appendTo(tabStreamAdvanced.body);

        const groupStreamProxyTimeout = new FormGroup(bodyCardAdv, 'Proxy timeout (value in minutes)');
        // eslint-disable-next-line no-new
        new TooltipInfo(groupStreamProxyTimeout.getLabelElement(), Lang.i().l('listen_stream_proxytimeout'));
        this._inputStreamProxyTimeout = new InputBottemBorderOnly2(groupStreamProxyTimeout, undefined, InputType.number);
        this._inputStreamProxyTimeout.setPlaceholder('10');

        const groupStreamProxyConnectTimeout = new FormGroup(bodyCardAdv, 'Proxy connect timeout (value in seconds)');
        // eslint-disable-next-line no-new
        new TooltipInfo(groupStreamProxyConnectTimeout.getLabelElement(), Lang.i().l('listen_stream_proxyconnecttimeout'));
        this._inputStreamProxyConnectTimeout = new InputBottemBorderOnly2(groupStreamProxyConnectTimeout, undefined, InputType.number);
        this._inputStreamProxyConnectTimeout.setPlaceholder('60');

        // button ------------------------------------------------------------------------------------------------------

        jQuery('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>').appendTo(this._footer);
        const btnSave = jQuery('<button type="button" class="btn btn-primary">Save changes</button>').appendTo(this._footer);

        btnSave.on('click', (): void => {
            if (this._onSaveClick !== null) {
                this._onSaveClick();
            }
        });

        // init tooltips
        Tooltip.init();
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
     * getAddressCheckType
     */
    public getAddressCheckType(): number {
        return parseInt(this._selectAddressCheckType.getSelectedValue(), 10) || ListenAddressCheckType.black;
    }

    /**
     * setAddressCheckType
     * @param actype
     */
    public setAddressCheckType(actype: number): void {
        this._selectAddressCheckType.setSelectedValue(`${actype}`);
    }

    /**
     * setProxyProtocol
     * @param enable
     */
    public setProxyProtocol(enable: boolean): void {
        this._switchProxyProtocol.setEnable(enable);
    }

    /**
     * getProxyProtocol
     */
    public getProxyProtocol(): boolean {
        return this._switchProxyProtocol.isEnable();
    }

    /**
     * setProxyProtocolIn
     * @param enable
     */
    public setProxyProtocolIn(enable: boolean): void {
        this._switchProxyProtocolIn.setEnable(enable);
    }

    /**
     * getProxyProtocolIn
     */
    public getProxyProtocolIn(): boolean {
        return this._switchProxyProtocolIn.isEnable();
    }

    /**
     * getDisable
     */
    public getDisable(): boolean {
        return this._switchDisable.isEnable();
    }

    /**
     * setDisable
     * @param disable
     */
    public setDisable(disable: boolean): void {
        this._switchDisable.setEnable(disable);
    }

    /**
     * Return the stream proxy timeout
     * @returns {string}
     */
    public getStreamProxyTimeout(): string {
        return this._inputStreamProxyTimeout.getValue();
    }

    /**
     * Set the stream proxy timeout
     * @param {string} value
     */
    public setStreamProxyTimeout(value: string): void {
        this._inputStreamProxyTimeout.setValue(value);
    }

    /**
     * Return the stream proxy connect timeout
     * @returns {string}
     */
    public getStreamProxyConnectTimeout(): string {
        return this._inputStreamProxyConnectTimeout.getValue();
    }

    /**
     * Set stream proxy connect timeout
     * @param {string} value
     */
    public setStreamProxyConnectTimeout(value: string): void {
        this._inputStreamProxyConnectTimeout.setValue(value);
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
        this.setAddressCheckType(ListenAddressCheckType.black);
        this.setDisable(false);
        this.setProxyProtocol(false);
        this.setProxyProtocolIn(false);
        this.setStreamProxyTimeout('');
        this.setStreamProxyConnectTimeout('');
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: ListensEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}