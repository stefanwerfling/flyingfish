import {
    Form, FormGroup, InputBottemBorderOnly2, InputType, SelectBottemBorderOnly2, Switch,
    Element, ModalDialog, ModalDialogType, LangText
} from 'bambooo';

/**
 * RouterInterfaceEditModal — add/edit a network interface (Pi-router epic, Phase 6):
 * its MAC (stable identity), OS name, router role and IPv4 addressing.
 */
export class RouterInterfaceEditModal extends ModalDialog {

    protected _id: number | null = null;

    protected _selectDetected: SelectBottemBorderOnly2;

    protected _available: Array<{name: string; mac: string; state: string; ipv4?: string;}> = [];

    protected _inputMac: InputBottemBorderOnly2;

    protected _inputName: InputBottemBorderOnly2;

    protected _selectRole: SelectBottemBorderOnly2;

    protected _selectIpv4Mode: SelectBottemBorderOnly2;

    protected _inputIpv4Address: InputBottemBorderOnly2;

    protected _inputIpv4Prefix: InputBottemBorderOnly2;

    protected _switchDisable: Switch;

    protected _switchNat44: Switch;

    protected _selectIpv6Mode: SelectBottemBorderOnly2;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'routerinterfacemodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"></div>').appendTo(this._body);
        const form = new Form(bodyCard);

        // Detected-NIC picker (interface discovery): populated from the live host NIC
        // list the netdevice part reports. Choosing one autofills the MAC + name below;
        // the MAC field stays editable for a manual entry when nothing is detected.
        const groupDetected = new FormGroup(form, 'Detected interface');
        this._selectDetected = new SelectBottemBorderOnly2(groupDetected);
        this._selectDetected.setValues([{key: '', value: '— select a detected NIC —'}]);
        this._selectDetected.setChangeFn((value): void => {
            const found = this._available.find((iface) => iface.mac === value);

            if (found) {
                this._inputMac.setValue(found.mac);
                this._inputName.setValue(found.name);
            }
        });

        const groupMac = new FormGroup(form, 'MAC address');
        this._inputMac = new InputBottemBorderOnly2(groupMac, 'ifacemac', InputType.text);

        const groupName = new FormGroup(form, 'Interface name (informational)');
        this._inputName = new InputBottemBorderOnly2(groupName, 'ifacename', InputType.text);

        const groupRole = new FormGroup(form, 'Role');
        this._selectRole = new SelectBottemBorderOnly2(groupRole);
        this._selectRole.setValues([
            {key: 'unassigned', value: 'Unassigned'},
            {key: 'wan', value: 'WAN (uplink, DHCP client)'},
            {key: 'lan', value: 'LAN (downlink, DHCP server)'}
        ]);

        const groupIpv4Mode = new FormGroup(form, 'IPv4 mode');
        this._selectIpv4Mode = new SelectBottemBorderOnly2(groupIpv4Mode);
        this._selectIpv4Mode.setValues([
            {key: 'none', value: 'None'},
            {key: 'dhcp', value: 'DHCP client'},
            {key: 'static', value: 'Static'}
        ]);

        const groupIpv4Address = new FormGroup(form, 'IPv4 address (static)');
        this._inputIpv4Address = new InputBottemBorderOnly2(groupIpv4Address, 'ifaceip', InputType.text);

        const groupIpv4Prefix = new FormGroup(form, 'IPv4 prefix (CIDR, e.g. 24)');
        this._inputIpv4Prefix = new InputBottemBorderOnly2(groupIpv4Prefix, 'ifaceprefix', InputType.number);

        // Per-LAN NAT (only meaningful for a LAN role): masquerade this LAN to the WAN,
        // and its own IPv6 mode so each LAN can differ (one NAT66, another PD-routed).
        const groupNat44 = new FormGroup(form, 'Enable NAT44 (masquerade this LAN → WAN)');
        this._switchNat44 = new Switch(groupNat44, 'ifacenat44');

        const groupIpv6Mode = new FormGroup(form, 'IPv6 mode');
        this._selectIpv6Mode = new SelectBottemBorderOnly2(groupIpv6Mode);
        this._selectIpv6Mode.setValues([
            {key: 'off', value: 'Off (no IPv6 routing)'},
            {key: 'nat66', value: 'NAT66 (masquerade a ULA → WAN IPv6)'},
            {key: 'pd', value: 'PD (route the delegated /64 — end-to-end)'}
        ]);

        const groupDisable = new FormGroup(form, 'Disable');
        this._switchDisable = new Switch(groupDisable, 'ifacedisable');

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);
    }

    /**
     * getId
     */
    public getId(): number | null {
        return this._id;
    }

    /**
     * setId
     * @param id
     */
    public setId(id: number | null): void {
        this._id = id;
    }

    /**
     * setAvailableInterfaces — populate the detected-NIC picker from the live host NIC
     * list reported by the netdevice part.
     * @param {Array<{name: string; mac: string; state: string; ipv4?: string;}>} list
     */
    public setAvailableInterfaces(list: Array<{name: string; mac: string; state: string; ipv4?: string;}>): void {
        this._available = list;

        // Clear first — setValues appends, so without this the placeholder + NICs
        // pile up every time the dialog is reopened.
        this._selectDetected.clearValues();

        const options = [{key: '', value: '— select a detected NIC —'}];

        for (const iface of list) {
            const ip = iface.ipv4 ? ` ${iface.ipv4}` : '';

            options.push({key: iface.mac, value: `${iface.name} [${iface.state}]${ip} — ${iface.mac}`});
        }

        this._selectDetected.setValues(options);
    }

    /**
     * setMac
     * @param mac
     */
    public setMac(mac: string): void {
        this._inputMac.setValue(mac);
    }

    /**
     * getMac
     */
    public getMac(): string {
        return this._inputMac.getValue();
    }

    /**
     * setName
     * @param name
     */
    public setName(name: string): void {
        this._inputName.setValue(name);
    }

    /**
     * getName
     */
    public getName(): string {
        return this._inputName.getValue();
    }

    /**
     * setRole
     * @param role
     */
    public setRole(role: string): void {
        this._selectRole.setSelectedValue(role);
    }

    /**
     * getRole
     */
    public getRole(): string {
        return this._selectRole.getSelectedValue();
    }

    /**
     * setIpv4Mode
     * @param mode
     */
    public setIpv4Mode(mode: string): void {
        this._selectIpv4Mode.setSelectedValue(mode);
    }

    /**
     * getIpv4Mode
     */
    public getIpv4Mode(): string {
        return this._selectIpv4Mode.getSelectedValue();
    }

    /**
     * setIpv4Address
     * @param address
     */
    public setIpv4Address(address: string): void {
        this._inputIpv4Address.setValue(address);
    }

    /**
     * getIpv4Address
     */
    public getIpv4Address(): string {
        return this._inputIpv4Address.getValue();
    }

    /**
     * setIpv4Prefix
     * @param prefix
     */
    public setIpv4Prefix(prefix: number): void {
        this._inputIpv4Prefix.setValue(`${prefix}`);
    }

    /**
     * getIpv4Prefix
     */
    public getIpv4Prefix(): number {
        return parseInt(this._inputIpv4Prefix.getValue(), 10) || 0;
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
     * setNat44Enabled
     * @param enable
     */
    public setNat44Enabled(enable: boolean): void {
        this._switchNat44.setEnable(enable);
    }

    /**
     * getNat44Enabled
     */
    public getNat44Enabled(): boolean {
        return this._switchNat44.isEnable();
    }

    /**
     * setIpv6Mode
     * @param mode
     */
    public setIpv6Mode(mode: string): void {
        this._selectIpv6Mode.setSelectedValue(mode);
    }

    /**
     * getIpv6Mode
     */
    public getIpv6Mode(): string {
        return this._selectIpv6Mode.getSelectedValue();
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this.setId(null);
        this._selectDetected.setSelectedValue('');
        this.setMac('');
        this.setName('');
        this.setRole('unassigned');
        this.setIpv4Mode('none');
        this.setIpv4Address('');
        this.setIpv4Prefix(0);
        this.setDisable(false);
        this.setNat44Enabled(false);
        this.setIpv6Mode('off');
    }

}