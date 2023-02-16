import {UpnpNat} from '../../Api/UpnpNat';
import {DialogInfo, Form, FormGroup, FormGroupButton, InputBottemBorderOnly2, InputType, Icon, IconFa,
    Element, ModalDialog, ModalDialogType} from 'bambooo';


/**
 * GatewayEditModalButtonClickFn
 */
type GatewayEditModalButtonClickFn = () => void;

/**
 * GatewayEditModal
 */
export class GatewayEditModal extends ModalDialog {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input network name
     * @protected
     */
    protected _inputNetworkName: InputBottemBorderOnly2;

    /**
     * input gateway mac address
     * @protected
     */
    protected _inputGatewayMacAddress: InputBottemBorderOnly2;

    /**
     * input gateway Ip address
     * @protected
     */
    protected _inputGatewayIpAddress: InputBottemBorderOnly2;

    /**
     * input color
     * @protected
     */
    protected _inputColor: InputBottemBorderOnly2;

    /**
     * click save fn
     * @protected
     */
    protected _onSaveClick: GatewayEditModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'gatewaymodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"></div>').appendTo(this._body);
        const form = new Form(bodyCard);

        const groupNetworkName = new FormGroup(form, 'Networkname');
        this._inputNetworkName = new InputBottemBorderOnly2(groupNetworkName, 'networkname', InputType.text);

        const groupGatewayMacAddress = new FormGroup(form, 'Gateway MAC address');
        const pickGatewayMac = new FormGroupButton(groupGatewayMacAddress);
        // eslint-disable-next-line no-new
        new Icon(pickGatewayMac.getIconElement(), IconFa.hockeypuck);
        this._inputGatewayMacAddress = new InputBottemBorderOnly2(pickGatewayMac, 'gatewaymacaddress');

        pickGatewayMac.setOnClickFn(async() => {
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

        const groupGatewayIPAddress = new FormGroup(form, 'Gateway IP address');
        const pickGatewayIp = new FormGroupButton(groupGatewayIPAddress);
        // eslint-disable-next-line no-new
        new Icon(pickGatewayIp.getIconElement(), IconFa.hockeypuck);
        this._inputGatewayIpAddress = new InputBottemBorderOnly2(pickGatewayIp, 'gatewayipaddress');

        pickGatewayIp.setOnClickFn(async() => {
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

        const groupColor = new FormGroup(form, 'Color');
        this._inputColor = new InputBottemBorderOnly2(groupColor, 'color', InputType.colorpicker);


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
     * ovverride for use
     */
    public resetValues(): void {
        this.setId(null);
        this.setNetworkName('');
        this.setGatewayMacAddress('');
        this.setGatewayIpAddress('');
        this.setColor('');
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: GatewayEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}