import {FfrField, FfrInput, FfrModal, FfrSection, FfrSwitch} from '../../Components/FfrModal.js';

/**
 * DhcpConfigEditModal — edit a LAN interface's DHCP server config (Pi-router epic): pool
 * range, lease time, gateway, the DNS server handed to clients, an optional domain and
 * IPv6 RA. One per LAN interface. Rendered in the FlyingFish `.ffr` design language.
 */
export class DhcpConfigEditModal {

    protected readonly _modal: FfrModal;

    protected _interfaceId: number = 0;

    protected readonly _switchEnable: FfrSwitch;

    protected readonly _inRangeStart: FfrInput;

    protected readonly _inRangeEnd: FfrInput;

    protected readonly _inLeaseTime: FfrInput;

    protected readonly _inGateway: FfrInput;

    protected readonly _inDnsServer: FfrInput;

    protected readonly _inDomain: FfrInput;

    protected readonly _switchRa: FfrSwitch;

    protected readonly _inRaInterval: FfrInput;

    protected readonly _inRaRouterLifetime: FfrInput;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('DHCP server', 'Save changes');
        const body = this._modal.getBody();

        const secServer = new FfrSection(body, 'DHCP server');
        this._switchEnable = new FfrSwitch('Enable the LAN DHCP server', false);
        secServer.element.append(this._switchEnable.element);

        const rowRange = FfrField.row(secServer.element);
        this._inRangeStart = new FfrInput(true, '192.168.50.100');
        new FfrField(rowRange, 'Range start').mount(this._inRangeStart.element);
        this._inRangeEnd = new FfrInput(true, '192.168.50.200');
        new FfrField(rowRange, 'Range end').mount(this._inRangeEnd.element);

        this._inLeaseTime = new FfrInput(true, '3600');
        new FfrField(secServer.element, 'Lease time', 'Seconds a lease is held.').mount(this._inLeaseTime.element);

        const secClient = new FfrSection(body, 'Handed to clients');
        this._inGateway = new FfrInput(true, '192.168.50.1');
        new FfrField(secClient.element, 'Gateway').mount(this._inGateway.element);
        this._inDnsServer = new FfrInput(true, '192.168.50.1');
        new FfrField(secClient.element, 'DNS server', 'Usually the FlyingFish DNS server.').mount(this._inDnsServer.element);
        this._inDomain = new FfrInput(false, 'lan');
        new FfrField(secClient.element, 'Local domain', 'Optional.').mount(this._inDomain.element);

        const secIpv6 = new FfrSection(body, 'IPv6');
        this._switchRa = new FfrSwitch('Enable Router Advertisement (SLAAC / DHCPv6)', false);
        secIpv6.element.append(this._switchRa.element);

        const rowRa = FfrField.row(secIpv6.element);
        this._inRaInterval = new FfrInput(true, '60');
        new FfrField(rowRa, 'IPv6 RA — max interval (s)', 'How often the router advertisement is sent. Lower keeps downstream routers refreshed (stability); 0 = dnsmasq default.').mount(this._inRaInterval.element);
        this._inRaRouterLifetime = new FfrInput(true, '9000');
        new FfrField(rowRa, 'IPv6 RA — router lifetime (s)', 'How long this node stays a downstream default router. Keep it above the address lifetime so the route never expires while the address persists; 0 = default.').mount(this._inRaRouterLifetime.element);
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
     * setInterfaceId — the LAN interface this DHCP config belongs to.
     * @param id - interface id
     */
    public setInterfaceId(id: number): void {
        this._interfaceId = id;
    }

    /**
     * getInterfaceId
     */
    public getInterfaceId(): number {
        return this._interfaceId;
    }

    /**
     * setEnable
     * @param enable - on-state
     */
    public setEnable(enable: boolean): void {
        this._switchEnable.setOn(enable);
    }

    /**
     * getEnable
     */
    public getEnable(): boolean {
        return this._switchEnable.isOn();
    }

    /**
     * setRangeStart
     * @param value - range start IP
     */
    public setRangeStart(value: string): void {
        this._inRangeStart.setValue(value);
    }

    /**
     * getRangeStart
     */
    public getRangeStart(): string {
        return this._inRangeStart.getValue();
    }

    /**
     * setRangeEnd
     * @param value - range end IP
     */
    public setRangeEnd(value: string): void {
        this._inRangeEnd.setValue(value);
    }

    /**
     * getRangeEnd
     */
    public getRangeEnd(): string {
        return this._inRangeEnd.getValue();
    }

    /**
     * setLeaseTime
     * @param value - seconds
     */
    public setLeaseTime(value: number): void {
        this._inLeaseTime.setValue(`${value}`);
    }

    /**
     * getLeaseTime
     */
    public getLeaseTime(): number {
        return parseInt(this._inLeaseTime.getValue(), 10) || 3600;
    }

    /**
     * setGateway
     * @param value - gateway IP
     */
    public setGateway(value: string): void {
        this._inGateway.setValue(value);
    }

    /**
     * getGateway
     */
    public getGateway(): string {
        return this._inGateway.getValue();
    }

    /**
     * setDnsServer
     * @param value - DNS server IP
     */
    public setDnsServer(value: string): void {
        this._inDnsServer.setValue(value);
    }

    /**
     * getDnsServer
     */
    public getDnsServer(): string {
        return this._inDnsServer.getValue();
    }

    /**
     * setDomain
     * @param value - local domain
     */
    public setDomain(value: string): void {
        this._inDomain.setValue(value);
    }

    /**
     * getDomain
     */
    public getDomain(): string {
        return this._inDomain.getValue();
    }

    /**
     * setRaEnable
     * @param enable - on-state
     */
    public setRaEnable(enable: boolean): void {
        this._switchRa.setOn(enable);
    }

    /**
     * getRaEnable
     */
    public getRaEnable(): boolean {
        return this._switchRa.isOn();
    }

    /**
     * setRaInterval — IPv6 RA max interval (seconds).
     * @param value - seconds
     */
    public setRaInterval(value: number): void {
        this._inRaInterval.setValue(`${value}`);
    }

    /**
     * getRaInterval
     */
    public getRaInterval(): number {
        const value = parseInt(this._inRaInterval.getValue(), 10);

        return Number.isFinite(value) && value >= 0 ? value : 60;
    }

    /**
     * setRaRouterLifetime — IPv6 RA router lifetime (seconds).
     * @param value - seconds
     */
    public setRaRouterLifetime(value: number): void {
        this._inRaRouterLifetime.setValue(`${value}`);
    }

    /**
     * getRaRouterLifetime
     */
    public getRaRouterLifetime(): number {
        const value = parseInt(this._inRaRouterLifetime.getValue(), 10);

        return Number.isFinite(value) && value >= 0 ? value : 9000;
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setEnable(false);
        this.setRangeStart('');
        this.setRangeEnd('');
        this.setLeaseTime(3600);
        this.setGateway('');
        this.setDnsServer('');
        this.setDomain('');
        this.setRaEnable(false);
        this.setRaInterval(60);
        this.setRaRouterLifetime(9000);
    }

}
