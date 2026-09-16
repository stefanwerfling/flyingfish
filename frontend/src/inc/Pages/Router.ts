import {NetworkInterfaceEntry, RouterOverviewResponse} from 'flyingfish_schemas';
import {
    Badge, BadgeType, Card, Circle, CircleColor, ContentCol, ContentColSize, DialogConfirm,
    ButtonType, ButtonMenu, IconFa, Table, Td, Th, Tr, ModalDialogType, LeftNavbarLink
} from 'bambooo';
import {Router as RouterAPI} from '../Api/Router.js';
import {BasePage} from './BasePage.js';
import {RouterInterfaceEditModal} from './Router/RouterInterfaceEditModal.js';
import {NatPolicyEditModal} from './Router/NatPolicyEditModal.js';
import {DhcpConfigEditModal} from './Router/DhcpConfigEditModal.js';

/**
 * Router — the Pi-router management page (Pi-router epic, Phase 6): manage the node's
 * network interfaces (WAN/LAN roles + IPv4), the NAT/routing policy and the LAN DHCP
 * server, and view the active leases + the WAN uplink lease. All server-side RBAC-gated.
 */
export class Router extends BasePage {

    /**
     * name
     * @protected
     */
    protected override _name: string = 'router';

    protected _interfaceDialog: RouterInterfaceEditModal;

    protected _natDialog: NatPolicyEditModal;

    protected _dhcpDialog: DhcpConfigEditModal;

    /**
     * the last loaded overview (so the NAT/DHCP navbar buttons can prefill their dialogs)
     * @protected
     */
    protected _overview: RouterOverviewResponse | null = null;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Router');

        const content = this._wrapper.getContentWrapper().getContent();

        this._interfaceDialog = new RouterInterfaceEditModal(content);
        this._natDialog = new NatPolicyEditModal(content);
        this._dhcpDialog = new DhcpConfigEditModal(content);

        // navbar: add interface --------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Interface', () => {
            this._interfaceDialog.resetValues();
            this._interfaceDialog.setTitle('Interface Add');
            this._interfaceDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        // navbar: NAT policy -----------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'NAT Policy', () => {
            const nat = this._overview?.natPolicy;
            this._natDialog.resetValues();
            this._natDialog.setTitle('NAT / routing policy');

            if (nat) {
                this._natDialog.setNat44Enabled(nat.nat44_enabled);
                this._natDialog.setIpv6Mode(nat.ipv6_mode);
                this._natDialog.setForwardEnabled(nat.forward_enabled);
            }

            this._natDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.edit);

        // navbar: DHCP config ----------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'DHCP Config', () => {
            const dhcp = this._overview?.dhcpConfig;
            this._dhcpDialog.resetValues();
            this._dhcpDialog.setTitle('LAN DHCP server');

            if (dhcp) {
                this._dhcpDialog.setEnable(dhcp.enable);
                this._dhcpDialog.setRangeStart(dhcp.range_start ?? '');
                this._dhcpDialog.setRangeEnd(dhcp.range_end ?? '');
                this._dhcpDialog.setLeaseTime(dhcp.lease_time ?? 3600);
                this._dhcpDialog.setGateway(dhcp.gateway ?? '');
                this._dhcpDialog.setDnsServer(dhcp.dns_server ?? '');
                this._dhcpDialog.setDomain(dhcp.domain ?? '');
                this._dhcpDialog.setRaEnable(dhcp.ra_enable ?? false);
            }

            this._dhcpDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.edit);

        // save handlers ----------------------------------------------------------------------------------------------

        this._interfaceDialog.setOnSave(async(): Promise<void> => {
            try {
                const entry: NetworkInterfaceEntry = {
                    id: this._interfaceDialog.getId() ?? 0,
                    mac_address: this._interfaceDialog.getMac(),
                    name: this._interfaceDialog.getName(),
                    role: this._interfaceDialog.getRole(),
                    ipv4_mode: this._interfaceDialog.getIpv4Mode(),
                    ipv4_address: this._interfaceDialog.getIpv4Address(),
                    ipv4_prefix: this._interfaceDialog.getIpv4Prefix(),
                    disable: this._interfaceDialog.getDisable()
                };

                if (await RouterAPI.saveInterface(entry)) {
                    this._interfaceDialog.hide();
                    this._toast.fire({icon: 'success', title: 'Interface saved.'});

                    if (this._onLoadTable) {
                        await this._onLoadTable();
                    }
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });

        this._natDialog.setOnSave(async(): Promise<void> => {
            try {
                if (await RouterAPI.saveNatPolicy({
                    nat44_enabled: this._natDialog.getNat44Enabled(),
                    ipv6_mode: this._natDialog.getIpv6Mode(),
                    forward_enabled: this._natDialog.getForwardEnabled()
                })) {
                    this._natDialog.hide();
                    this._toast.fire({icon: 'success', title: 'NAT policy saved.'});

                    if (this._onLoadTable) {
                        await this._onLoadTable();
                    }
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });

        this._dhcpDialog.setOnSave(async(): Promise<void> => {
            try {
                if (await RouterAPI.saveDhcpConfig({
                    enable: this._dhcpDialog.getEnable(),
                    range_start: this._dhcpDialog.getRangeStart(),
                    range_end: this._dhcpDialog.getRangeEnd(),
                    lease_time: this._dhcpDialog.getLeaseTime(),
                    gateway: this._dhcpDialog.getGateway(),
                    dns_server: this._dhcpDialog.getDnsServer(),
                    domain: this._dhcpDialog.getDomain(),
                    ra_enable: this._dhcpDialog.getRaEnable()
                })) {
                    this._dhcpDialog.hide();
                    this._toast.fire({icon: 'success', title: 'DHCP config saved.'});

                    if (this._onLoadTable) {
                        await this._onLoadTable();
                    }
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();
        const cardInterfaces = new Card(new ContentCol(content, ContentColSize.col12));
        const cardStatus = new Card(new ContentCol(content, ContentColSize.col12));
        const cardLeases = new Card(new ContentCol(content, ContentColSize.col12));

        this._onLoadTable = async(): Promise<void> => {
            const overview = await RouterAPI.getOverview();
            this._overview = overview;

            this._renderInterfaces(cardInterfaces, overview);
            Router._renderStatus(cardStatus, overview);
            Router._renderLeases(cardLeases, overview);
        };

        await this._onLoadTable();
    }

    /**
     * Render the interfaces table (with edit/delete).
     * @param card - the card to render into
     * @param overview - the loaded overview
     * @protected
     */
    protected _renderInterfaces(card: Card, overview: RouterOverviewResponse): void {
        card.emptyBody();
        card.setTitle('Network interfaces');

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Status', '32px');
        // eslint-disable-next-line no-new
        new Th(trhead, 'Role');
        // eslint-disable-next-line no-new
        new Th(trhead, 'MAC');
        // eslint-disable-next-line no-new
        new Th(trhead, 'Name');
        // eslint-disable-next-line no-new
        new Th(trhead, 'IPv4');
        // eslint-disable-next-line no-new
        new Th(trhead, '');

        for (const iface of overview.interfaces) {
            const trbody = new Tr(table.getTbody());

            const tdStatus = new Td(trbody, '');
            // eslint-disable-next-line no-new
            new Circle(tdStatus, iface.disable ? CircleColor.gray : CircleColor.green);

            const tdRole = new Td(trbody, '');
            // eslint-disable-next-line no-new
            new Badge(tdRole, iface.role, iface.role === 'unassigned' ? BadgeType.secondary : BadgeType.primary);

            // eslint-disable-next-line no-new
            new Td(trbody, `${iface.mac_address}`);
            // eslint-disable-next-line no-new
            new Td(trbody, `${iface.name ?? ''}`);
            // eslint-disable-next-line no-new
            new Td(trbody, iface.ipv4_mode === 'static' ? `${iface.ipv4_address ?? ''}/${iface.ipv4_prefix ?? 0}` : `${iface.ipv4_mode}`);

            const tdAction = new Td(trbody, '');
            const btnMenu = new ButtonMenu(tdAction, IconFa.bars, true, ButtonType.borderless);

            btnMenu.addMenuItem('Edit', async(): Promise<void> => {
                this._interfaceDialog.resetValues();
                this._interfaceDialog.setTitle('Interface Edit');
                this._interfaceDialog.show();
                this._interfaceDialog.setId(iface.id);
                this._interfaceDialog.setMac(iface.mac_address);
                this._interfaceDialog.setName(iface.name ?? '');
                this._interfaceDialog.setRole(iface.role);
                this._interfaceDialog.setIpv4Mode(iface.ipv4_mode);
                this._interfaceDialog.setIpv4Address(iface.ipv4_address ?? '');
                this._interfaceDialog.setIpv4Prefix(iface.ipv4_prefix ?? 0);
                this._interfaceDialog.setDisable(iface.disable ?? false);
            }, IconFa.edit);

            btnMenu.addDivider();

            btnMenu.addMenuItem('Delete', (): void => {
                DialogConfirm.confirm(
                    'routerInterfaceDelete',
                    ModalDialogType.large,
                    'Delete interface',
                    `Delete the interface "${iface.mac_address}"?`,
                    async(_, dialog) => {
                        try {
                            if (await RouterAPI.deleteInterface(iface.id)) {
                                this._toast.fire({icon: 'success', title: 'Interface deleted.'});
                            }
                        } catch (message) {
                            this._toast.fire({icon: 'error', title: message});
                        }

                        dialog.hide();

                        if (this._onLoadTable) {
                            await this._onLoadTable();
                        }
                    },
                    undefined,
                    'Delete'
                );
            }, IconFa.trash);
        }
    }

    /**
     * Render the NAT / DHCP / WAN-lease status summary.
     * @param card - the card to render into
     * @param overview - the loaded overview
     * @protected
     */
    protected static _renderStatus(card: Card, overview: RouterOverviewResponse): void {
        card.emptyBody();
        card.setTitle('NAT / DHCP / WAN status');

        const table = new Table(card.getElement());
        // eslint-disable-next-line no-new
        new Th(new Tr(table.getThead()), 'Setting');

        const row = (label: string, value: string): void => {
            const tr = new Tr(table.getTbody());
            // eslint-disable-next-line no-new
            new Td(tr, label);
            // eslint-disable-next-line no-new
            new Td(tr, value);
        };

        const nat = overview.natPolicy;
        row('NAT44 (IPv4 masquerade)', nat?.nat44_enabled ? 'on' : 'off');
        row('IPv6 mode', nat?.ipv6_mode ?? 'off');
        row('IP forwarding', nat?.forward_enabled ? 'on' : 'off');

        const dhcp = overview.dhcpConfig;
        row('LAN DHCP server', dhcp?.enable ? 'on' : 'off');
        row('DHCP range', dhcp ? `${dhcp.range_start ?? ''} - ${dhcp.range_end ?? ''}` : '-');

        const wan = overview.wanLease;
        row('WAN IPv4', wan ? `${wan.ipv4_address}/${wan.ipv4_prefix} via ${wan.gateway}` : '-');
        row('WAN IPv6 prefix (PD)', wan?.ipv6_prefix ? wan.ipv6_prefix : '-');
    }

    /**
     * Render the active LAN DHCP leases.
     * @param card - the card to render into
     * @param overview - the loaded overview
     * @protected
     */
    protected static _renderLeases(card: Card, overview: RouterOverviewResponse): void {
        card.emptyBody();
        card.setTitle('LAN DHCP leases');

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());
        // eslint-disable-next-line no-new
        new Th(trhead, 'MAC');
        // eslint-disable-next-line no-new
        new Th(trhead, 'IP');
        // eslint-disable-next-line no-new
        new Th(trhead, 'Hostname');

        for (const lease of overview.leases) {
            const trbody = new Tr(table.getTbody());
            // eslint-disable-next-line no-new
            new Td(trbody, `${lease.mac_address}`);
            // eslint-disable-next-line no-new
            new Td(trbody, `${lease.ip_address}`);
            // eslint-disable-next-line no-new
            new Td(trbody, `${lease.hostname}`);
        }
    }

}