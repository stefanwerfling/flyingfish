import {GatewayIdentifierEntry, ListenData} from 'flyingfish_schemas';
import {DialogInfo, ModalDialogType} from 'bambooo';
import {ListenTypes} from '../../Api/Listen.js';
import {UpnpNat} from '../../Api/UpnpNat.js';
import {FfrField, FfrInput, FfrModal, FfrSection, FfrSegmented, FfrSelect, FfrSwitch} from '../../Components/FfrModal.js';

/**
 * UpnpNatEditModal — add/edit a Upnp-Nat mapping (gateway assignment, public/private ports,
 * client address, listen, TTL, protocol). Rendered in the FlyingFish `.ffr` design language
 * (see {@link FfrModal}): sectioned form, segmented protocol control, switches, mono inputs.
 * Public API (get/set per field + resetValues) is unchanged so the page is agnostic to the
 * widget set.
 */
export class UpnpNatEditModal {

    protected readonly _modal: FfrModal;

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * select gateway identifier
     * @protected
     */
    protected readonly _selectGatewayIdentifier: FfrSelect;

    /**
     * input gateway address
     * @protected
     */
    protected readonly _inputGatewayAddress: FfrInput;

    /**
     * input public port
     * @protected
     */
    protected readonly _inputPublicPort: FfrInput;

    /**
     * input client address
     * @protected
     */
    protected readonly _inputClientAddress: FfrInput;

    /**
     * switch use host address
     * @protected
     */
    protected readonly _switchUseHostAddress: FfrSwitch;

    /**
     * input privat port
     * @protected
     */
    protected readonly _inputPrivatPort: FfrInput;

    /**
     * select listen
     * @protected
     */
    protected readonly _selectListen: FfrSelect;

    /**
     * input ttl
     * @protected
     */
    protected readonly _inputTtl: FfrInput;

    /**
     * select protocol
     * @protected
     */
    protected readonly _segProtocol: FfrSegmented;

    /**
     * input description
     * @protected
     */
    protected readonly _inputDescription: FfrInput;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('Upnp-Nat', 'Save changes');
        const body = this._modal.getBody();

        // gateway ----------------------------------------------------------------------------------------------------
        const secGateway = new FfrSection(body, 'Gateway');

        this._selectGatewayIdentifier = new FfrSelect();
        new FfrField(secGateway.element, 'Gateway network assignment').mount(this._selectGatewayIdentifier.element);

        this._inputGatewayAddress = new FfrInput(true, 'gatewayaddress');
        const gatewayAddressPick = jQuery('<button type="button" class="ffr-btn">Use gateway</button>');
        const gatewayAddressGroup = jQuery('<div style="display:flex; gap:8px; align-items:center;"></div>');
        this._inputGatewayAddress.element.css('flex', '1');
        gatewayAddressGroup.append(this._inputGatewayAddress.element).append(gatewayAddressPick);
        new FfrField(secGateway.element, 'Gateway address').mount(gatewayAddressGroup);

        gatewayAddressPick.on('click', async() => {
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

        this._inputPublicPort = new FfrInput(true, 'publicport');
        new FfrField(secGateway.element, 'Public port').mount(this._inputPublicPort.element);

        // client -----------------------------------------------------------------------------------------------------
        const secClient = new FfrSection(body, 'Client');

        this._inputClientAddress = new FfrInput(true, 'clientaddress');
        const clientAddressPick = jQuery('<button type="button" class="ffr-btn">Use host</button>');
        const clientAddressGroup = jQuery('<div style="display:flex; gap:8px; align-items:center;"></div>');
        this._inputClientAddress.element.css('flex', '1');
        clientAddressGroup.append(this._inputClientAddress.element).append(clientAddressPick);
        new FfrField(secClient.element, 'Client address').mount(clientAddressGroup);

        clientAddressPick.on('click', async() => {
            if (this._inputClientAddress.element.prop('readonly')) {
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

        this._switchUseHostAddress = new FfrSwitch('Use Host address by DHCP', false);
        secClient.element.append(this._switchUseHostAddress.element);
        this._switchUseHostAddress.element.on('click', () => {
            this._applyUseHostAddress();
        });

        // mapping ----------------------------------------------------------------------------------------------------
        const secMapping = new FfrSection(body, 'Mapping');

        const rowPrivat = FfrField.row(secMapping.element);

        this._inputPrivatPort = new FfrInput(true, 'privatport');
        new FfrField(rowPrivat, 'Privat port', 'or select a Listen').mount(this._inputPrivatPort.element);

        this._selectListen = new FfrSelect();
        this._selectListen.onChange((value) => {
            switch (value) {
                case '0':
                    this._inputPrivatPort.element.prop('readonly', false);
                    break;

                default:
                    this._inputPrivatPort.element.prop('readonly', true);
                    this._inputPrivatPort.setValue('');
            }
        });
        new FfrField(rowPrivat, 'Listen').mount(this._selectListen.element);

        this._inputTtl = new FfrInput(true, 'ttl');
        this._inputTtl.setValue('36000');
        new FfrField(secMapping.element, 'TTL').mount(this._inputTtl.element);

        this._segProtocol = new FfrSegmented([
            {key: 'tcp', label: 'TCP'},
            {key: 'udp', label: 'UDP'}
        ], 'tcp');
        new FfrField(secMapping.element, 'Protocol').mount(this._segProtocol.element);

        this._inputDescription = new FfrInput(false, 'A description ...');
        new FfrField(secMapping.element, 'Description').mount(this._inputDescription.element);
    }

    /**
     * Apply the "use host address" state: when on, clear and lock the client address input.
     * @protected
     */
    protected _applyUseHostAddress(): void {
        if (this._switchUseHostAddress.isOn()) {
            this._inputClientAddress.setValue('');
            this._inputClientAddress.element.prop('readonly', true);
        } else {
            this._inputClientAddress.element.prop('readonly', false);
        }
    }

    /**
     * setTitle
     * @param text - dialog title
     */
    public setTitle(text: string): void {
        this._modal.setTitle(text);
    }

    /**
     * setOnSave
     * @param fn - save handler
     */
    public setOnSave(fn: () => void): void {
        this._modal.setOnSave(fn);
    }

    /**
     * show
     */
    public show(): void {
        this._modal.show();
    }

    /**
     * hide
     */
    public hide(): void {
        this._modal.hide();
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
        const options: {key: string; value: string;}[] = [{
            key: '0',
            value: 'Please select your Listen'
        }];

        for (const aGatewayIdentiefer of list) {
            options.push({
                key: `${aGatewayIdentiefer.id}`,
                value: aGatewayIdentiefer.networkname
            });
        }

        this._selectGatewayIdentifier.setValues(options);
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
        return this._switchUseHostAddress.isOn();
    }

    /**
     * setUseHostAddress
     * @param enable
     */
    public setUseHostAddress(enable: boolean): void {
        this._switchUseHostAddress.setOn(enable);
        this._applyUseHostAddress();
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
        const options: {key: string; value: string;}[] = [{
            key: '0',
            value: 'Please select your Listen'
        }];

        for (const alisten of listens) {
            if (alisten.type === ListenTypes.stream) {
                const type = alisten.type === 0 ? 'Stream' : 'HTTP';

                options.push({
                    key: `${alisten.id}`,
                    value: `${alisten.name} - ${alisten.port} (${type})`
                });
            }
        }

        this._selectListen.setValues(options);
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
        this._segProtocol.setValue(protocol);
    }

    /**
     * getProtocol
     */
    public getProtocol(): string {
        return this._segProtocol.getValue();
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
        this.setGatewayIdentifier(0);
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

}
