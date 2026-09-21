import {FfrField, FfrModal, FfrSection, FfrSelect, FfrSwitch} from '../../Components/FfrModal.js';

/**
 * NatPolicyEditModal — edit the node's NAT/routing policy (Pi-router epic): IP forwarding,
 * IPv4 NAT (masquerade) and the IPv6 mode. A singleton per node. Rendered in the FlyingFish
 * `.ffr` design language (see {@link FfrModal}).
 */
export class NatPolicyEditModal {

    protected readonly _modal: FfrModal;

    protected readonly _switchForward: FfrSwitch;

    protected readonly _switchNat44: FfrSwitch;

    protected readonly _selectIpv6Mode: FfrSelect;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('Routing / forwarding', 'Save changes');
        const body = this._modal.getBody();

        const secRouting = new FfrSection(body, 'Routing');
        this._switchForward = new FfrSwitch('Enable routing (IP forwarding)', false);
        secRouting.element.append(this._switchForward.element);

        const secNat = new FfrSection(body, 'NAT');
        this._switchNat44 = new FfrSwitch('NAT44 — masquerade LAN → WAN (IPv4)', false);
        secNat.element.append(this._switchNat44.element);

        this._selectIpv6Mode = new FfrSelect();
        this._selectIpv6Mode.setValues([
            {key: 'off', value: 'Off (no IPv6 routing)'},
            {key: 'nat66', value: 'NAT66 (masquerade LAN ULA → WAN)'},
            {key: 'pd', value: 'DHCPv6-PD routing (delegated prefix, no NAT)'}
        ]);
        new FfrField(secNat.element, 'IPv6 mode').mount(this._selectIpv6Mode.element);
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
     * setNat44Enabled
     * @param enabled - on-state
     */
    public setNat44Enabled(enabled: boolean): void {
        this._switchNat44.setOn(enabled);
    }

    /**
     * getNat44Enabled
     */
    public getNat44Enabled(): boolean {
        return this._switchNat44.isOn();
    }

    /**
     * setIpv6Mode
     * @param mode - off | nat66 | pd
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
     * setForwardEnabled
     * @param enabled - on-state
     */
    public setForwardEnabled(enabled: boolean): void {
        this._switchForward.setOn(enabled);
    }

    /**
     * getForwardEnabled
     */
    public getForwardEnabled(): boolean {
        return this._switchForward.isOn();
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setNat44Enabled(false);
        this.setIpv6Mode('off');
        this.setForwardEnabled(false);
    }

}
