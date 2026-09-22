import {DialogInfo, ModalDialogType} from 'bambooo';
import {UpnpNat} from '../../Api/UpnpNat.js';
import {FfrField, FfrInput, FfrModal, FfrSection} from '../../Components/FfrModal.js';

/**
 * GatewayEditModal — add/edit a gateway identifier (network name, gateway MAC/IP address and a
 * color). Rendered in the FlyingFish `.ffr` design language (see {@link FfrModal}): sectioned
 * form, mono inputs for the addresses and an inline "Detect" helper that fills the MAC/IP from
 * the local UPnP gateway. Public API (get/set per field + resetValues) is unchanged so the page
 * is agnostic to the widget set.
 */
export class GatewayEditModal {

    /**
     * the modal
     * @protected
     */
    protected readonly _modal: FfrModal;

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input network name
     * @protected
     */
    protected readonly _inputNetworkName: FfrInput;

    /**
     * input gateway mac address
     * @protected
     */
    protected readonly _inputGatewayMacAddress: FfrInput;

    /**
     * input gateway Ip address
     * @protected
     */
    protected readonly _inputGatewayIpAddress: FfrInput;

    /**
     * input color
     * @protected
     */
    protected readonly _inputColor: FfrInput;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('Gateway', 'Save changes');
        const body = this._modal.getBody();

        const secGateway = new FfrSection(body, 'Gateway');

        this._inputNetworkName = new FfrInput(false, 'Networkname');
        new FfrField(secGateway.element, 'Networkname').mount(this._inputNetworkName.element);

        this._inputGatewayMacAddress = new FfrInput(true, '00:00:00:00:00:00');
        const macField = new FfrField(secGateway.element, 'Gateway MAC address');
        macField.mount(this._inputGatewayMacAddress.element);

        const macBtn = jQuery('<button type="button" class="ffr-btn">Detect</button>').appendTo(macField.element);
        macBtn.on('click', async() => {
            const gatewayInfo = await UpnpNat.getCurrentGatewayInfo();

            if (gatewayInfo) {
                this._inputGatewayMacAddress.setValue(gatewayInfo.gatwaymac_address);
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

        this._inputGatewayIpAddress = new FfrInput(true, '0.0.0.0');
        const ipField = new FfrField(secGateway.element, 'Gateway IP address');
        ipField.mount(this._inputGatewayIpAddress.element);

        const ipBtn = jQuery('<button type="button" class="ffr-btn">Detect</button>').appendTo(ipField.element);
        ipBtn.on('click', async() => {
            const gatewayInfo = await UpnpNat.getCurrentGatewayInfo();

            if (gatewayInfo) {
                this._inputGatewayIpAddress.setValue(gatewayInfo.gatway_address);
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

        this._inputColor = new FfrInput(false, '#000000');
        new FfrField(secGateway.element, 'Color').mount(this._inputColor.element);
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
     * setNetworkName
     * @param name
     */
    public setNetworkName(name: string): void {
        this._inputNetworkName.setValue(name);
    }

    /**
     * getNetworkName
     */
    public getNetworkName(): string {
        return this._inputNetworkName.getValue();
    }

    /**
     * setGatewayMacAddress
     * @param mac
     */
    public setGatewayMacAddress(mac: string): void {
        this._inputGatewayMacAddress.setValue(mac);
    }

    /**
     * getGatewayMacAddress
     */
    public getGatewayMacAddress(): string {
        return this._inputGatewayMacAddress.getValue();
    }

    /**
     * setGatewayIpAddress
     * @param address
     */
    public setGatewayIpAddress(address: string): void {
        this._inputGatewayIpAddress.setValue(address);
    }

    /**
     * getGatewayIpAddress
     */
    public getGatewayIpAddress(): string {
        return this._inputGatewayIpAddress.getValue();
    }

    /**
     * setColor
     * @param color
     */
    public setColor(color: string): void {
        this._inputColor.setValue(color);
    }

    /**
     * getColor
     */
    public getColor(): string {
        return this._inputColor.getValue();
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setNetworkName('');
        this.setGatewayMacAddress('');
        this.setGatewayIpAddress('');
        this.setColor('');
    }

}
