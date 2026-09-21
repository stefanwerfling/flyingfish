import {FfrField, FfrInput, FfrModal, FfrSection, FfrSelect, FfrSwitch} from '../../Components/FfrModal.js';

/**
 * RouterInterfaceEditModal — add/edit a network interface (Pi-router epic): its MAC (stable
 * identity), OS name, router role, IPv4 addressing and per-LAN NAT/IPv6 mode. Rendered in
 * the FlyingFish `.ffr` design language (see {@link FfrModal}). The detected-NIC picker is
 * fed from the live host NIC list the netdevice part reports; choosing one autofills MAC +
 * name.
 */
export class RouterInterfaceEditModal {

    protected readonly _modal: FfrModal;

    protected _id: number | null = null;

    protected _available: Array<{name: string; mac: string; state: string; ipv4?: string;}> = [];

    protected readonly _selectDetected: FfrSelect;

    protected readonly _inMac: FfrInput;

    protected readonly _inName: FfrInput;

    protected readonly _selectRole: FfrSelect;

    protected readonly _selectIpv4Mode: FfrSelect;

    protected readonly _inIpv4Address: FfrInput;

    protected readonly _inIpv4Prefix: FfrInput;

    protected readonly _switchNat44: FfrSwitch;

    protected readonly _selectIpv6Mode: FfrSelect;

    protected readonly _switchDisable: FfrSwitch;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('Interface', 'Save changes');
        const body = this._modal.getBody();

        // --- Interface identity -------------------------------------------------------------------------------------
        const secIface = new FfrSection(body, 'Interface');
        this._selectDetected = new FfrSelect();
        this._selectDetected.setValues([{key: '', value: '— select a detected NIC —'}]);
        this._selectDetected.onChange((value) => {
            const found = this._available.find((iface) => iface.mac === value);

            if (found) {
                this._inMac.setValue(found.mac);
                this._inName.setValue(found.name);
            }
        });
        new FfrField(secIface.element, 'Detected interface', 'Pick a live NIC to autofill its MAC + name.').mount(this._selectDetected.element);

        const rowId = FfrField.row(secIface.element);
        this._inMac = new FfrInput(true, 'aa:bb:cc:dd:ee:ff');
        new FfrField(rowId, 'MAC address').mount(this._inMac.element);
        this._inName = new FfrInput(false, 'eth0');
        new FfrField(rowId, 'Name', 'Informational.').mount(this._inName.element);

        // --- Role & addressing --------------------------------------------------------------------------------------
        const secAddr = new FfrSection(body, 'Role & addressing');
        this._selectRole = new FfrSelect();
        this._selectRole.setValues([
            {key: 'unassigned', value: 'Unassigned'},
            {key: 'wan', value: 'WAN (uplink, DHCP client)'},
            {key: 'lan', value: 'LAN (downlink, DHCP server)'}
        ]);
        new FfrField(secAddr.element, 'Role').mount(this._selectRole.element);

        this._selectIpv4Mode = new FfrSelect();
        this._selectIpv4Mode.setValues([
            {key: 'none', value: 'None'},
            {key: 'dhcp', value: 'DHCP client'},
            {key: 'static', value: 'Static'}
        ]);
        new FfrField(secAddr.element, 'IPv4 mode').mount(this._selectIpv4Mode.element);

        const rowIp = FfrField.row(secAddr.element);
        this._inIpv4Address = new FfrInput(true, '192.168.50.1');
        new FfrField(rowIp, 'IPv4 address', 'For static mode.').mount(this._inIpv4Address.element);
        this._inIpv4Prefix = new FfrInput(true, '24');
        new FfrField(rowIp, 'IPv4 prefix', 'CIDR, e.g. 24.').mount(this._inIpv4Prefix.element);

        // --- NAT / IPv6 (per LAN) -----------------------------------------------------------------------------------
        const secNat = new FfrSection(body, 'NAT / IPv6 (LAN)');
        this._switchNat44 = new FfrSwitch('NAT44 — masquerade this LAN → WAN', false);
        secNat.element.append(this._switchNat44.element);

        this._selectIpv6Mode = new FfrSelect();
        this._selectIpv6Mode.setValues([
            {key: 'off', value: 'Off (no IPv6 routing)'},
            {key: 'nat66', value: 'NAT66 (masquerade a ULA → WAN IPv6)'},
            {key: 'pd', value: 'PD (route the delegated /64 — end-to-end)'},
            {key: 'pd-server', value: 'PD server (delegate ULA prefixes downstream, masqueraded)'}
        ]);
        new FfrField(secNat.element, 'IPv6 mode').mount(this._selectIpv6Mode.element);

        // --- Options ------------------------------------------------------------------------------------------------
        const secOpt = new FfrSection(body, 'Options');
        this._switchDisable = new FfrSwitch('Disable this interface', false);
        secOpt.element.append(this._switchDisable.element);
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
    public getId(): number | null {
        return this._id;
    }

    /**
     * setId
     * @param id - interface id (null = create)
     */
    public setId(id: number | null): void {
        this._id = id;
    }

    /**
     * setAvailableInterfaces — populate the detected-NIC picker.
     * @param list - live host NIC list
     */
    public setAvailableInterfaces(list: Array<{name: string; mac: string; state: string; ipv4?: string;}>): void {
        this._available = list;

        const options = [{key: '', value: '— select a detected NIC —'}];

        for (const iface of list) {
            const ip = iface.ipv4 ? ` ${iface.ipv4}` : '';
            options.push({key: iface.mac, value: `${iface.name} [${iface.state}]${ip} — ${iface.mac}`});
        }

        this._selectDetected.setValues(options);
    }

    /**
     * setMac
     * @param mac - MAC address
     */
    public setMac(mac: string): void {
        this._inMac.setValue(mac);

        // On edit, reflect the interface in the detected-NIC picker if its MAC is live
        // (so the picker shows which physical NIC this is, not the placeholder).
        if (mac !== '' && this._available.some((iface) => iface.mac === mac)) {
            this._selectDetected.setSelectedValue(mac);
        }
    }

    /**
     * getMac
     */
    public getMac(): string {
        return this._inMac.getValue();
    }

    /**
     * setName
     * @param name - interface name
     */
    public setName(name: string): void {
        this._inName.setValue(name);
    }

    /**
     * getName
     */
    public getName(): string {
        return this._inName.getValue();
    }

    /**
     * setRole
     * @param role - unassigned | wan | lan
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
     * @param mode - none | dhcp | static
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
     * @param address - IPv4 address
     */
    public setIpv4Address(address: string): void {
        this._inIpv4Address.setValue(address);
    }

    /**
     * getIpv4Address
     */
    public getIpv4Address(): string {
        return this._inIpv4Address.getValue();
    }

    /**
     * setIpv4Prefix
     * @param prefix - CIDR prefix
     */
    public setIpv4Prefix(prefix: number): void {
        this._inIpv4Prefix.setValue(`${prefix}`);
    }

    /**
     * getIpv4Prefix
     */
    public getIpv4Prefix(): number {
        return parseInt(this._inIpv4Prefix.getValue(), 10) || 0;
    }

    /**
     * setDisable
     * @param disable - on-state
     */
    public setDisable(disable: boolean): void {
        this._switchDisable.setOn(disable);
    }

    /**
     * getDisable
     */
    public getDisable(): boolean {
        return this._switchDisable.isOn();
    }

    /**
     * setNat44Enabled
     * @param enable - on-state
     */
    public setNat44Enabled(enable: boolean): void {
        this._switchNat44.setOn(enable);
    }

    /**
     * getNat44Enabled
     */
    public getNat44Enabled(): boolean {
        return this._switchNat44.isOn();
    }

    /**
     * setIpv6Mode
     * @param mode - off | nat66 | pd | pd-server
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
    public resetValues(): void {
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
