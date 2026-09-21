import {FfrField, FfrInput, FfrModal, FfrSection, FfrSegmented, FfrSwitch} from '../../Components/FfrModal.js';

/**
 * Parse a WAN port field value ("443" or "8000-8010") into a start/end pair.
 * @param value - the raw field value
 * @returns {{start: number; end: number;}} start (0 if empty/invalid) and end (0 = single)
 */
function parsePortRange(value: string): {start: number; end: number;} {
    const match = (/^(\d+)(?:\s*-\s*(\d+))?$/u).exec(value.trim());

    if (match === null) {
        return {start: 0, end: 0};
    }

    return {
        start: parseInt(match[1], 10) || 0,
        end: match[2] ? (parseInt(match[2], 10) || 0) : 0
    };
}

/**
 * PortForwardEditModal — create/edit one inbound firewall / port-forwarding rule
 * (Pi-router epic, Phase 2), in the FlyingFish `.ffr` design language (see {@link FfrModal}):
 * a sectioned form with segmented controls and a switch, matching the Router page. The WAN
 * port field accepts a single port or a range (`8000-8010`, forwarded 1:1). The
 * destination-type toggle hides the host fields (+ family) for a `router` rule.
 */
export class PortForwardEditModal {

    protected readonly _modal: FfrModal;

    protected _id: number = 0;

    protected readonly _segTarget: FfrSegmented;

    protected readonly _segProto: FfrSegmented;

    protected readonly _segFamily: FfrSegmented;

    protected readonly _inWanPort: FfrInput;

    protected readonly _inHost: FfrInput;

    protected readonly _inHostPort: FfrInput;

    protected readonly _inDescription: FfrInput;

    protected readonly _switchEnabled: FfrSwitch;

    /**
     * Field wrappers toggled by the destination type (hidden for a `router` target).
     */
    protected readonly _fieldFamily: FfrField;

    protected readonly _rowHost: JQuery;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('Add inbound rule', 'Save changes');
        const body = this._modal.getBody();

        // --- Incoming (WAN) -----------------------------------------------------------------------------------------
        const secIn = new FfrSection(body, 'Incoming (WAN)');
        const rowIn = FfrField.row(secIn.element);

        this._segProto = new FfrSegmented([
            {key: 'tcp', label: 'TCP'},
            {key: 'udp', label: 'UDP'},
            {key: 'both', label: 'Both'}
        ], 'tcp');
        new FfrField(rowIn, 'Protocol').mount(this._segProto.element);

        this._inWanPort = new FfrInput(true, '443');
        new FfrField(rowIn, 'WAN port', 'A range is ok: <code>8000-8010</code> (forwarded 1:1).').mount(this._inWanPort.element);

        this._segFamily = new FfrSegmented([
            {key: 'ipv4', label: 'IPv4'},
            {key: 'ipv6', label: 'IPv6'}
        ], 'ipv4');
        this._fieldFamily = new FfrField(secIn.element, 'Address family', 'Must match the target host.');
        this._fieldFamily.mount(this._segFamily.element);

        // --- Destination --------------------------------------------------------------------------------------------
        const secDst = new FfrSection(body, 'Destination');

        this._segTarget = new FfrSegmented([
            {key: 'host', label: 'A LAN host'},
            {key: 'router', label: 'This router'}
        ], 'host');
        new FfrField(
            secDst.element,
            'Send to',
            'Forward to a device behind the router (DNAT), or open the port on the Pi itself.'
        ).mount(this._segTarget.element);
        this._segTarget.onChange(() => this._syncTargetFields());

        this._rowHost = FfrField.row(secDst.element);
        this._inHost = new FfrInput(true, '192.168.50.170');
        new FfrField(this._rowHost, 'Host IP', 'A LAN IPv4 or IPv6 address.').mount(this._inHost.element);
        this._inHostPort = new FfrInput(true, '');
        new FfrField(this._rowHost, 'Host port', 'Blank / 0 = same as the WAN port.').mount(this._inHostPort.element);

        // --- Options ------------------------------------------------------------------------------------------------
        const secOpt = new FfrSection(body, 'Options');
        this._inDescription = new FfrInput(false, 'e.g. NAS / web');
        new FfrField(secOpt.element, 'Description').mount(this._inDescription.element);
        this._switchEnabled = new FfrSwitch('Enable rule now', true);
        secOpt.element.append(this._switchEnabled.element);

        this._syncTargetFields();
    }

    /**
     * Show/hide the host-only fields (family + host IP/port) by destination type.
     * @protected
     */
    protected _syncTargetFields(): void {
        const isHost = this._segTarget.getValue() === 'host';
        this._rowHost.css('display', isHost ? '' : 'none');
        // A router pinhole is dual-stack — the family is irrelevant, so hide it.
        this._fieldFamily.element.css('display', isHost ? '' : 'none');
    }

    // --- open/close + save --------------------------------------------------------------------------------------------

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

    // --- values -------------------------------------------------------------------------------------------------------

    /**
     * setId
     * @param id - the rule id (0 = create)
     */
    public setId(id: number): void {
        this._id = id;
    }

    /**
     * getId
     */
    public getId(): number {
        return this._id;
    }

    /**
     * setEnabled
     * @param enabled - on-state
     */
    public setEnabled(enabled: boolean): void {
        this._switchEnabled.setOn(enabled);
    }

    /**
     * getEnabled
     */
    public getEnabled(): boolean {
        return this._switchEnabled.isOn();
    }

    /**
     * setDescription
     * @param value - description
     */
    public setDescription(value: string): void {
        this._inDescription.setValue(value);
    }

    /**
     * getDescription
     */
    public getDescription(): string {
        return this._inDescription.getValue();
    }

    /**
     * setTargetType
     * @param value - `host` | `router`
     */
    public setTargetType(value: string): void {
        this._segTarget.setValue(value === 'router' ? 'router' : 'host');
        this._syncTargetFields();
    }

    /**
     * getTargetType
     */
    public getTargetType(): string {
        return this._segTarget.getValue();
    }

    /**
     * setProto
     * @param value - `tcp` | `udp` | `both`
     */
    public setProto(value: string): void {
        this._segProto.setValue(value);
    }

    /**
     * getProto
     */
    public getProto(): string {
        return this._segProto.getValue();
    }

    /**
     * setFamily
     * @param value - `ipv4` | `ipv6`
     */
    public setFamily(value: string): void {
        this._segFamily.setValue(value === 'ipv6' ? 'ipv6' : 'ipv4');
    }

    /**
     * getFamily
     */
    public getFamily(): string {
        return this._segFamily.getValue();
    }

    /**
     * setWanPort — the range start (recomposes the field, keeping any range end).
     * @param value - port
     */
    public setWanPort(value: number): void {
        const {end} = parsePortRange(this._inWanPort.getValue());
        this._inWanPort.setValue(value > 0 ? (end > value ? `${value}-${end}` : `${value}`) : '');
    }

    /**
     * getWanPort — the range start.
     */
    public getWanPort(): number {
        return parsePortRange(this._inWanPort.getValue()).start;
    }

    /**
     * setWanPortEnd — the range end (recomposes the field, keeping the start).
     * @param value - end port (0 = single)
     */
    public setWanPortEnd(value: number): void {
        const {start} = parsePortRange(this._inWanPort.getValue());
        this._inWanPort.setValue(start > 0 ? (value > start ? `${start}-${value}` : `${start}`) : '');
    }

    /**
     * getWanPortEnd — the range end (0 = single port).
     */
    public getWanPortEnd(): number {
        return parsePortRange(this._inWanPort.getValue()).end;
    }

    /**
     * setTargetHost
     * @param value - host IP
     */
    public setTargetHost(value: string): void {
        this._inHost.setValue(value);
    }

    /**
     * getTargetHost
     */
    public getTargetHost(): string {
        return this._inHost.getValue();
    }

    /**
     * setTargetPort
     * @param value - host port (0 = same as WAN)
     */
    public setTargetPort(value: number): void {
        this._inHostPort.setValue(value > 0 ? `${value}` : '');
    }

    /**
     * getTargetPort
     */
    public getTargetPort(): number {
        return parseInt(this._inHostPort.getValue(), 10) || 0;
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setId(0);
        this.setEnabled(true);
        this.setDescription('');
        this.setProto('tcp');
        this.setFamily('ipv4');
        this._inWanPort.setValue('');
        this.setTargetHost('');
        this._inHostPort.setValue('');
        this.setTargetType('host');
    }

}
