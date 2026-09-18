import {
    Form, FormGroup, InputBottemBorderOnly2, InputType, Switch,
    Element, ModalDialog, ModalDialogType, LangText
} from 'bambooo';

/**
 * DhcpConfigEditModal — edit the LAN DHCP server config (Pi-router epic, Phase 6):
 * range, lease time, gateway, the DNS server handed to clients (the FlyingFish
 * dnsserver), an optional domain and IPv6 RA. A singleton per node.
 */
export class DhcpConfigEditModal extends ModalDialog {

    protected _interfaceId: number = 0;

    protected _switchEnable: Switch;

    protected _inputRangeStart: InputBottemBorderOnly2;

    protected _inputRangeEnd: InputBottemBorderOnly2;

    protected _inputLeaseTime: InputBottemBorderOnly2;

    protected _inputGateway: InputBottemBorderOnly2;

    protected _inputDnsServer: InputBottemBorderOnly2;

    protected _inputDomain: InputBottemBorderOnly2;

    protected _switchRa: Switch;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'dhcpconfigmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"></div>').appendTo(this._body);
        const form = new Form(bodyCard);

        const groupEnable = new FormGroup(form, 'Enable LAN DHCP server');
        this._switchEnable = new Switch(groupEnable, 'dhcpenable');

        const groupRangeStart = new FormGroup(form, 'Range start');
        this._inputRangeStart = new InputBottemBorderOnly2(groupRangeStart, 'dhcprangestart', InputType.text);

        const groupRangeEnd = new FormGroup(form, 'Range end');
        this._inputRangeEnd = new InputBottemBorderOnly2(groupRangeEnd, 'dhcprangeend', InputType.text);

        const groupLeaseTime = new FormGroup(form, 'Lease time (seconds)');
        this._inputLeaseTime = new InputBottemBorderOnly2(groupLeaseTime, 'dhcpleasetime', InputType.number);

        const groupGateway = new FormGroup(form, 'Gateway');
        this._inputGateway = new InputBottemBorderOnly2(groupGateway, 'dhcpgateway', InputType.text);

        const groupDnsServer = new FormGroup(form, 'DNS server (handed to clients)');
        this._inputDnsServer = new InputBottemBorderOnly2(groupDnsServer, 'dhcpdns', InputType.text);

        const groupDomain = new FormGroup(form, 'Local domain (optional)');
        this._inputDomain = new InputBottemBorderOnly2(groupDomain, 'dhcpdomain', InputType.text);

        const groupRa = new FormGroup(form, 'Enable IPv6 RA (SLAAC/DHCPv6)');
        this._switchRa = new Switch(groupRa, 'dhcpra');

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);
    }

    /**
     * setEnable
     * @param enable
     */
    /**
     * setInterfaceId — the LAN interface this DHCP config belongs to.
     * @param {number} id
     */
    public setInterfaceId(id: number): void {
        this._interfaceId = id;
    }

    /**
     * getInterfaceId
     * @returns {number}
     */
    public getInterfaceId(): number {
        return this._interfaceId;
    }

    /**
     * setEnable
     * @param {boolean} enable
     */
    public setEnable(enable: boolean): void {
        this._switchEnable.setEnable(enable);
    }

    /**
     * getEnable
     */
    public getEnable(): boolean {
        return this._switchEnable.isEnable();
    }

    /**
     * setRangeStart
     * @param value
     */
    public setRangeStart(value: string): void {
        this._inputRangeStart.setValue(value);
    }

    /**
     * getRangeStart
     */
    public getRangeStart(): string {
        return this._inputRangeStart.getValue();
    }

    /**
     * setRangeEnd
     * @param value
     */
    public setRangeEnd(value: string): void {
        this._inputRangeEnd.setValue(value);
    }

    /**
     * getRangeEnd
     */
    public getRangeEnd(): string {
        return this._inputRangeEnd.getValue();
    }

    /**
     * setLeaseTime
     * @param value
     */
    public setLeaseTime(value: number): void {
        this._inputLeaseTime.setValue(`${value}`);
    }

    /**
     * getLeaseTime
     */
    public getLeaseTime(): number {
        return parseInt(this._inputLeaseTime.getValue(), 10) || 0;
    }

    /**
     * setGateway
     * @param value
     */
    public setGateway(value: string): void {
        this._inputGateway.setValue(value);
    }

    /**
     * getGateway
     */
    public getGateway(): string {
        return this._inputGateway.getValue();
    }

    /**
     * setDnsServer
     * @param value
     */
    public setDnsServer(value: string): void {
        this._inputDnsServer.setValue(value);
    }

    /**
     * getDnsServer
     */
    public getDnsServer(): string {
        return this._inputDnsServer.getValue();
    }

    /**
     * setDomain
     * @param value
     */
    public setDomain(value: string): void {
        this._inputDomain.setValue(value);
    }

    /**
     * getDomain
     */
    public getDomain(): string {
        return this._inputDomain.getValue();
    }

    /**
     * setRaEnable
     * @param enable
     */
    public setRaEnable(enable: boolean): void {
        this._switchRa.setEnable(enable);
    }

    /**
     * getRaEnable
     */
    public getRaEnable(): boolean {
        return this._switchRa.isEnable();
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this.setInterfaceId(0);
        this.setEnable(false);
        this.setRangeStart('');
        this.setRangeEnd('');
        this.setLeaseTime(3600);
        this.setGateway('');
        this.setDnsServer('');
        this.setDomain('');
        this.setRaEnable(false);
    }

}