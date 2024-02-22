import {GatewayIdentifierEntry, ListenData} from 'flyingfish_schemas';
import {ListenTypes} from '../../Api/Listen';
import {UpnpNat} from '../../Api/UpnpNat';
import {DialogInfo, Form, FormGroup, FormGroupButton, FormRow, InputBottemBorderOnly2, InputType,
    SelectBottemBorderOnly2, Switch, Icon, IconFa, Element, ModalDialog, ModalDialogType} from 'bambooo';

/**
 * UpnpNatEditModalButtonClickFn
 */
type UpnpNatEditModalButtonClickFn = () => Promise<void>;

/**
 * UpnpNatEditModal
 */
export class UpnpNatEditModal extends ModalDialog {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * select gateway identifier
     * @protected
     */
    protected _selectGatewayIdentifier: SelectBottemBorderOnly2;

    /**
     * input gateway address
     * @protected
     */
    protected _inputGatewayAddress: InputBottemBorderOnly2;

    /**
     * input public port
     * @protected
     */
    protected _inputPublicPort: InputBottemBorderOnly2;

    /**
     * input client address
     * @protected
     */
    protected _inputClientAddress: InputBottemBorderOnly2;

    /**
     * switch use host address
     * @protected
     */
    protected _switchUseHostAddress: Switch;

    /**
     * input privat port
     * @protected
     */
    protected _inputPrivatPort: InputBottemBorderOnly2;

    /**
     * select listen
     * @protected
     */
    protected _selectListen: SelectBottemBorderOnly2;

    /**
     * input ttl
     * @protected
     */
    protected _inputTtl: InputBottemBorderOnly2;

    /**
     * select protocol
     * @protected
     */
    protected _selectProtocol: SelectBottemBorderOnly2;

    /**
     * input description
     * @protected
     */
    protected _inputDescription: InputBottemBorderOnly2;

    /**
     * click save fn
     * @protected
     */
    protected _onSaveClick: UpnpNatEditModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'upnpmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"></div>').appendTo(this._body);
        const form = new Form(bodyCard);

        const groupGatewayIdentifier = new FormGroup(form, 'Gateway network assignment');
        this._selectGatewayIdentifier = new SelectBottemBorderOnly2(groupGatewayIdentifier);

        const groupGatewayAddress = new FormGroup(form, 'Gateway address');
        const pickGatewayIp = new FormGroupButton(groupGatewayAddress);
        // eslint-disable-next-line no-new
        new Icon(pickGatewayIp.getIconElement(), IconFa.hockeypuck);
        this._inputGatewayAddress = new InputBottemBorderOnly2(pickGatewayIp, 'gatewayaddress');

        pickGatewayIp.setOnClickFn(async() => {
            const gatewayInfo = await UpnpNat.getCurrentGatewayInfo();

            if (gatewayInfo) {
                this._inputGatewayAddress.setValue(gatewayInfo.gatway_address);
            } else {
                DialogInfo.info(
                    'infoUpnpNat',
                    ModalDialogType.small,
                    'Info',
                    'The information on your own gateway is not available!',
                    (_, modal: DialogInfo) => {
                        modal.hide();
                    }
                );
            }
        });

        const groupPublicPort = new FormGroup(form, 'Public port');
        this._inputPublicPort = new InputBottemBorderOnly2(groupPublicPort, 'publicport', InputType.number);

        const rowClient = new FormRow(form);

        const groupClientAddress = new FormGroup(rowClient.createCol(7), 'Client address');
        const pickClientIp = new FormGroupButton(groupClientAddress);
        // eslint-disable-next-line no-new
        new Icon(pickClientIp.getIconElement(), IconFa.ethernet);
        this._inputClientAddress = new InputBottemBorderOnly2(pickClientIp, 'clientaddress');

        pickClientIp.setOnClickFn(async() => {
            if (this._inputClientAddress.isReadOnly()) {
                console.log('client ip is disabled!');
                return;
            }

            const gatewayInfo = await UpnpNat.getCurrentGatewayInfo();

            if (gatewayInfo) {
                this._inputClientAddress.setValue(gatewayInfo.client_address);
            } else {
                DialogInfo.info(
                    'infoUpnpNat',
                    ModalDialogType.small,
                    'Info',
                    'The information on your own host is not available!',
                    (_, modal: DialogInfo) => {
                        modal.hide();
                    }
                );
            }
        });

        const groupHost = new FormGroup(rowClient.createCol(5), 'Use Host address by DHCP');
        this._switchUseHostAddress = new Switch(groupHost, 'usehostaddress');
        this._switchUseHostAddress.setChangeFn((value: boolean) => {
            if (value) {
                this._inputClientAddress.setValue('');
                this._inputClientAddress.setReadOnly(true);
            } else {
                this._inputClientAddress.setReadOnly(false);
            }
        });

        const rowPrivatPort = new FormRow(form);
        const groupPrivatPort = new FormGroup(rowPrivatPort.createCol(5), 'Privat port');
        this._inputPrivatPort = new InputBottemBorderOnly2(groupPrivatPort, 'privatport', InputType.number);

        // eslint-disable-next-line no-new
        new FormGroup(rowPrivatPort.createCol(1), 'or');

        const groupListen = new FormGroup(rowPrivatPort.createCol(6), 'Listen');
        this._selectListen = new SelectBottemBorderOnly2(groupListen);

        this._selectListen.setChangeFn((value) => {
            switch (value) {
                case '0':
                    this._inputPrivatPort.setReadOnly(false);
                    break;

                default:
                    this._inputPrivatPort.setReadOnly(true);
                    this._inputPrivatPort.setValue('');
            }
        });

        const groupTTL = new FormGroup(form, 'TTL');
        this._inputTtl = new InputBottemBorderOnly2(groupTTL, 'ttl', InputType.number);
        this._inputTtl.setValue('36000');

        const groupProtocol = new FormGroup(form, 'Protocol');
        this._selectProtocol = new SelectBottemBorderOnly2(groupProtocol);
        this._selectProtocol.addValue({
            key: 'tcp',
            value: 'TCP'
        });

        this._selectProtocol.addValue({
            key: 'udp',
            value: 'UDP'
        });

        const groupDescription = new FormGroup(form, 'Description');
        this._inputDescription = new InputBottemBorderOnly2(groupDescription, 'natdescription');
        this._inputDescription.setPlaceholder('A description ...');

        jQuery('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>').appendTo(this._footer);
        const btnSave = jQuery('<button type="button" class="btn btn-primary">Save changes</button>').appendTo(this._footer);

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
     * setGatewayIdentifiers
     * @param list
     */
    public setGatewayIdentifiers(list: GatewayIdentifierEntry[]): void {
        this._selectGatewayIdentifier.clearValues();
        this._selectGatewayIdentifier.addValue({
            key: '0',
            value: 'Please select your Listen'
        });

        for (const aGatewayIdentiefer of list) {
            this._selectGatewayIdentifier.addValue({
                key: `${aGatewayIdentiefer.id}`,
                value: aGatewayIdentiefer.networkname
            });
        }
    }

    /**
     * setGatewayIdentifier
     * @param gatewayIdentifier
     */
    public setGatewayIdentifier(gatewayIdentifier: number): void {
        this._selectGatewayIdentifier.setSelectedValue(`${gatewayIdentifier}`);
    }

    /**
     * getGatewayIdentifier
     */
    public getGatewayIdentifier(): number {
        return parseInt(this._selectGatewayIdentifier.getSelectedValue(), 10) || 0;
    }

    /**
     * setGatewayAddress
     * @param address
     */
    public setGatewayAddress(address: string): void {
        this._inputGatewayAddress.setValue(address);
    }

    /**
     * getGatewayAddress
     */
    public getGatewayAddress(): string {
        return this._inputGatewayAddress.getValue();
    }

    /**
     * setPublicPort
     * @param port
     */
    public setPublicPort(port: number): void {
        this._inputPublicPort.setValue(`${port}`);
    }

    /**
     * getPublicPort
     */
    public getPublicPort(): number {
        return parseInt(this._inputPublicPort.getValue(), 10) || 0;
    }

    /**
     * setClientAddress
     * @param address
     */
    public setClientAddress(address: string): void {
        this._inputClientAddress.setValue(address);
    }

    /**
     * getClientAddress
     */
    public getClientAddress(): string {
        return this._inputClientAddress.getValue();
    }

    /**
     * getUseHostAddress
     */
    public getUseHostAddress(): boolean {
        return this._switchUseHostAddress.isEnable();
    }

    /**
     * setUseHostAddress
     * @param enable
     */
    public setUseHostAddress(enable: boolean): void {
        this._switchUseHostAddress.setEnable(enable);
    }

    /**
     * setPrivatPort
     * @param port
     */
    public setPrivatPort(port: number): void {
        this._inputPrivatPort.setValue(`${port}`);
    }

    /**
     * getPrivatPort
     */
    public getPrivatPort(): number {
        return parseInt(this._inputPrivatPort.getValue(), 10) || 0;
    }

    /**
     * setListens
     * @param listens
     */
    public setListens(listens: ListenData[]): void {
        this._selectListen.clearValues();

        this._selectListen.addValue({
            key: '0',
            value: 'Please select your Listen'
        });

        for (const alisten of listens) {
            if (alisten.type === ListenTypes.stream) {
                const type = alisten.type === 0 ? 'Stream' : 'HTTP';

                const option = {
                    key: `${alisten.id}`,
                    value: `${alisten.name} - ${alisten.port} (${type})`,
                    style: alisten.type === ListenTypes.stream ? 'background:#ffc107;' : 'background:#28a745;'
                };

                this._selectListen.addValue(option);
            }
        }
    }

    /**
     * setListen
     * @param listen
     */
    public setListen(listen: string): void {
        this._selectListen.setSelectedValue(listen);
    }

    /**
     * getListen
     */
    public getListen(): number {
        return parseInt(this._selectListen.getSelectedValue(), 10) || 0;
    }

    /**
     * setTTL
     * @param ttl
     */
    public setTTL(ttl: number): void {
        this._inputTtl.setValue(`${ttl}`);
    }

    /**
     * getTTL
     */
    public getTTL(): number {
        return parseInt(this._inputTtl.getValue(), 10) || 0;
    }

    /**
     * setProtocol
     * @param protocol
     */
    public setProtocol(protocol: string): void {
        this._selectProtocol.setSelectedValue(protocol);
    }

    /**
     * getProtocol
     */
    public getProtocol(): string {
        return this._selectProtocol.getSelectedValue();
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
        this.setGatewayAddress('');
        this._inputPublicPort.setValue('');
        this.setClientAddress('');
        this.setUseHostAddress(false);
        this._inputPrivatPort.setValue('');
        this.setListen('0');
        this.setTTL(36000);
        this.setProtocol('tcp');
        this.setDescription('');
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: UpnpNatEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}