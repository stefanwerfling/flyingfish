import {
    Form, FormGroup, SelectBottemBorderOnly2, Switch,
    Element, ModalDialog, ModalDialogType, LangText
} from 'bambooo';

/**
 * NatPolicyEditModal — edit the node's NAT/routing policy (Pi-router epic, Phase 6):
 * IPv4 NAT (masquerade), the IPv6 mode (off / NAT66 / DHCPv6-PD routing) and IP
 * forwarding. A singleton per node.
 */
export class NatPolicyEditModal extends ModalDialog {

    protected _switchNat44: Switch;

    protected _selectIpv6Mode: SelectBottemBorderOnly2;

    protected _switchForward: Switch;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'natpolicymodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"></div>').appendTo(this._body);
        const form = new Form(bodyCard);

        const groupForward = new FormGroup(form, 'Enable routing (IP forwarding)');
        this._switchForward = new Switch(groupForward, 'natforward');

        const groupNat44 = new FormGroup(form, 'NAT44 (IPv4 masquerade LAN → WAN)');
        this._switchNat44 = new Switch(groupNat44, 'nat44');

        const groupIpv6Mode = new FormGroup(form, 'IPv6 mode');
        this._selectIpv6Mode = new SelectBottemBorderOnly2(groupIpv6Mode);
        this._selectIpv6Mode.setValues([
            {key: 'off', value: 'Off (no IPv6 routing)'},
            {key: 'nat66', value: 'NAT66 (masquerade LAN ULA → WAN)'},
            {key: 'pd', value: 'DHCPv6-PD routing (delegated prefix, no NAT)'}
        ]);

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);
    }

    /**
     * setNat44Enabled
     * @param enabled
     */
    public setNat44Enabled(enabled: boolean): void {
        this._switchNat44.setEnable(enabled);
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
     * setForwardEnabled
     * @param enabled
     */
    public setForwardEnabled(enabled: boolean): void {
        this._switchForward.setEnable(enabled);
    }

    /**
     * getForwardEnabled
     */
    public getForwardEnabled(): boolean {
        return this._switchForward.isEnable();
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this.setNat44Enabled(false);
        this.setIpv6Mode('off');
        this.setForwardEnabled(false);
    }

}