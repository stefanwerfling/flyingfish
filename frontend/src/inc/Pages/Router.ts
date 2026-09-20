import './Router/router.css';
import {AvailableInterface, NetworkInterfaceEntry, RouterOverviewResponse} from 'flyingfish_schemas';
import {
    ContentCol, ContentColSize, DialogConfirm, IconFa, LeftNavbarLink, ModalDialogType
} from 'bambooo';
import {Router as RouterAPI} from '../Api/Router.js';
import {BasePage} from './BasePage.js';
import {RouteCanvas} from './Router/RouteCanvas.js';
import {InterfaceCard, InterfaceView} from './Router/InterfaceCard.js';
import {RouterInterfaceEditModal} from './Router/RouterInterfaceEditModal.js';
import {NatPolicyEditModal} from './Router/NatPolicyEditModal.js';
import {DhcpConfigEditModal} from './Router/DhcpConfigEditModal.js';

/**
 * Router — the Pi-router management page (interface-centric UI v2). A routing map
 * (Internet → router → LAN segments → clients, with per-flow NAT44/NAT66) over a grid of
 * self-contained interface cards: each interface shows its own addressing, DHCP server,
 * IPv6 mode and clients. NAT is per interface. All server-side RBAC-gated.
 */
export class Router extends BasePage {

    protected override _name: string = 'router';

    protected _interfaceDialog: RouterInterfaceEditModal;

    protected _natDialog: NatPolicyEditModal;

    protected _dhcpDialog: DhcpConfigEditModal;

    protected _overview: RouterOverviewResponse | null = null;

    protected _canvas: RouteCanvas | null = null;

    protected _lanColors = ['var(--ffr-lan0)', 'var(--ffr-lan1)', 'var(--ffr-lan2)', 'var(--ffr-lan3)'];

    /**
     * Previous rx/tx byte counters + timestamp per interface MAC, to derive a live rate.
     */
    protected _trafficPrev = new Map<string, {rx: number; tx: number; t: number;}>();

    /**
     * Current in/out rate (bytes/s) per interface MAC, computed from the counter deltas.
     */
    protected _trafficRate = new Map<string, {rx: number; tx: number;}>();

    /**
     * The live-refresh timer (polls the overview so traffic rates update); cleared on unload.
     */
    protected _refreshTimer: ReturnType<typeof setInterval> | null = null;

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
            this._interfaceDialog.setAvailableInterfaces(this._overview?.availableInterfaces ?? []);
            this._interfaceDialog.setTitle('Interface Add');
            this._interfaceDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        // navbar: router-wide forwarding (NAT is per interface now) ----------------------------------------------------
        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Routing', () => {
            const nat = this._overview?.natPolicy;
            this._natDialog.resetValues();
            this._natDialog.setTitle('Routing / forwarding');

            if (nat) {
                this._natDialog.setNat44Enabled(nat.nat44_enabled);
                this._natDialog.setIpv6Mode(nat.ipv6_mode);
                this._natDialog.setForwardEnabled(nat.forward_enabled);
            }

            this._natDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.edit);

        this._registerSaveHandlers();
    }

    /**
     * Wire the modal save handlers (interface incl. per-LAN NAT, routing policy, DHCP).
     * @protected
     */
    protected _registerSaveHandlers(): void {
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
                    disable: this._interfaceDialog.getDisable(),
                    nat44_enabled: this._interfaceDialog.getNat44Enabled(),
                    ipv6_mode: this._interfaceDialog.getIpv6Mode()
                };

                if (await RouterAPI.saveInterface(entry)) {
                    this._interfaceDialog.hide();
                    this._toast.fire({icon: 'success', title: 'Interface saved.'});
                    await this._reload();
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
                    this._toast.fire({icon: 'success', title: 'Routing policy saved.'});
                    await this._reload();
                }
            } catch (message) {
                this._toast.fire({icon: 'error', title: message});
            }
        });

        this._dhcpDialog.setOnSave(async(): Promise<void> => {
            try {
                if (await RouterAPI.saveDhcpConfig({
                    network_interface_id: this._dhcpDialog.getInterfaceId(),
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
                    await this._reload();
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
        const col = new ContentCol(content, ContentColSize.col12);
        const root = jQuery('<div class="ffr"></div>').appendTo(col.getElement());

        const canvasMount = jQuery('<div></div>').appendTo(root);
        const grid = jQuery('<div class="ffr-grid"></div>').appendTo(root);

        this._canvas = new RouteCanvas(canvasMount);

        this._onLoadTable = async(): Promise<void> => {
            const overview = await RouterAPI.getOverview();
            this._overview = overview;

            this._computeTraffic(overview.availableInterfaces ?? []);
            this._canvas?.update(overview);
            this._renderCards(grid, overview);
        };

        await this._onLoadTable();

        // Live refresh: re-poll the overview so the in/out traffic rates update.
        this._refreshTimer = setInterval((): void => {
            this._reload().catch((): void => {
                // best-effort; a transient error just skips this tick
            });
        }, 3000);
    }

    /**
     * Stop the live-refresh timer when the page is left.
     */
    public override unloadContent(): void {
        if (this._refreshTimer !== null) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = null;
        }
    }

    /**
     * Derive the live in/out rate (bytes/s) per interface from the delta of its rx/tx byte
     * counters between polls, and remember the current sample for the next tick.
     * @param interfaces - the discovered interfaces (carry rxBytes/txBytes)
     * @protected
     */
    protected _computeTraffic(interfaces: AvailableInterface[]): void {
        const now = Date.now() / 1000;

        for (const iface of interfaces) {
            if (iface.rxBytes === undefined || iface.txBytes === undefined) {
                continue;
            }

            const mac = iface.mac.toLowerCase();
            const prev = this._trafficPrev.get(mac);

            if (prev && now > prev.t) {
                const dt = now - prev.t;
                this._trafficRate.set(mac, {
                    rx: Math.max(0, (iface.rxBytes - prev.rx) / dt),
                    tx: Math.max(0, (iface.txBytes - prev.tx) / dt)
                });
            }

            this._trafficPrev.set(mac, {rx: iface.rxBytes, tx: iface.txBytes, t: now});
        }
    }

    /**
     * Reload the overview (map + cards).
     * @protected
     */
    protected async _reload(): Promise<void> {
        if (this._onLoadTable) {
            await this._onLoadTable();
        }
    }

    /**
     * Render the interface cards: every configured interface, then detected NICs that are
     * not configured yet (merged by MAC), each as a self-contained card.
     * @param grid - the grid element
     * @param overview - the loaded overview
     * @protected
     */
    protected _renderCards(grid: JQuery, overview: RouterOverviewResponse): void {
        grid.empty();

        const norm = (mac: string): string => mac.toLowerCase();
        const detected = overview.availableInterfaces ?? [];
        const configuredMacs = new Set(overview.interfaces.map((entry) => norm(entry.mac_address)));

        // stable per-LAN colour (by LAN order) so the map + cards match
        const lanColor = new Map<number, string>();
        overview.interfaces.filter((entry) => entry.role === 'lan').forEach((entry, index) => {
            lanColor.set(entry.id, this._lanColors[index % this._lanColors.length]);
        });

        for (const iface of overview.interfaces) {
            // eslint-disable-next-line no-new
            new InterfaceCard(grid, this._buildView(iface, detected, overview, lanColor.get(iface.id) ?? this._lanColors[0]));
        }

        for (const det of detected) {
            if (configuredMacs.has(norm(det.mac))) {
                continue;
            }

            // eslint-disable-next-line no-new
            new InterfaceCard(grid, this._buildDetectedView(det));
        }
    }

    /**
     * Build the card view for a configured interface.
     * @param iface - the configured interface
     * @param detected - the live detected NIC list (for up-state)
     * @param overview - the loaded overview
     * @param laneColor - the LAN colour
     * @protected
     */
    protected _buildView(
        iface: NetworkInterfaceEntry,
        detected: AvailableInterface[],
        overview: RouterOverviewResponse,
        laneColor: string
    ): InterfaceView {
        const det = detected.find((entry) => entry.mac.toLowerCase() === iface.mac_address.toLowerCase()) ?? null;
        const ipv4 = iface.ipv4_mode === 'static' && iface.ipv4_address
            ? `${iface.ipv4_address}/${iface.ipv4_prefix ?? 24}`
            : (det?.ipv4 ?? iface.ipv4_mode);

        return {
            mac: iface.mac_address,
            name: iface.name || '',
            role: iface.role,
            up: det ? det.state === 'up' : !(iface.disable ?? false),
            disabled: iface.disable ?? false,
            configured: true,
            ipv4: ipv4,
            ipv4note: iface.ipv4_mode === 'static' ? 'static gateway' : iface.ipv4_mode,
            ipv6: det?.ipv6,
            rxRate: this._trafficRate.get(iface.mac_address.toLowerCase())?.rx,
            txRate: this._trafficRate.get(iface.mac_address.toLowerCase())?.tx,
            laneColor: laneColor,
            dhcp: (overview.dhcpConfigs ?? []).find((entry) => entry.network_interface_id === iface.id) ?? null,
            ipv6mode: iface.ipv6_mode ?? 'off',
            leases: overview.leases.filter((entry) => entry.interface === (iface.name || '')),
            wanLease: iface.role === 'wan' ? overview.wanLease : null,
            nat44: iface.nat44_enabled ?? false,
            forward: overview.natPolicy?.forward_enabled ?? false,
            actions: {
                onEdit: () => this._openInterface(iface, detected),
                onDelete: () => this._confirmDelete(iface),
                onEditDhcp: () => this._openDhcp(iface)
            }
        };
    }

    /**
     * Build the card view for a detected-but-unconfigured NIC.
     * @param det - the detected NIC
     * @protected
     */
    protected _buildDetectedView(det: AvailableInterface): InterfaceView {
        return {
            mac: det.mac,
            name: det.name,
            role: '',
            up: det.state === 'up',
            disabled: false,
            configured: false,
            ipv4: det.ipv4 ?? det.state,
            ipv4note: 'detected',
            ipv6: det.ipv6,
            rxRate: this._trafficRate.get(det.mac.toLowerCase())?.rx,
            txRate: this._trafficRate.get(det.mac.toLowerCase())?.tx,
            laneColor: this._lanColors[0],
            actions: {
                onAssign: () => {
                    this._interfaceDialog.resetValues();
                    this._interfaceDialog.setAvailableInterfaces(this._overview?.availableInterfaces ?? []);
                    this._interfaceDialog.setTitle('Assign interface');
                    this._interfaceDialog.show();
                    this._interfaceDialog.setMac(det.mac);
                    this._interfaceDialog.setName(det.name);
                }
            }
        };
    }

    /**
     * Open the interface edit modal, prefilled.
     * @param iface - the interface to edit
     * @param detected - the detected NIC list
     * @protected
     */
    protected _openInterface(iface: NetworkInterfaceEntry, detected: AvailableInterface[]): void {
        this._interfaceDialog.resetValues();
        this._interfaceDialog.setAvailableInterfaces(detected);
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
        this._interfaceDialog.setNat44Enabled(iface.nat44_enabled ?? false);
        this._interfaceDialog.setIpv6Mode(iface.ipv6_mode ?? 'off');
    }

    /**
     * Open the DHCP modal for a LAN interface, prefilled.
     * @param iface - the LAN interface
     * @protected
     */
    protected _openDhcp(iface: NetworkInterfaceEntry): void {
        const dhcp = (this._overview?.dhcpConfigs ?? []).find((entry) => entry.network_interface_id === iface.id) ?? null;
        this._dhcpDialog.resetValues();
        this._dhcpDialog.setInterfaceId(iface.id);
        this._dhcpDialog.setTitle(`DHCP server — ${iface.name || iface.mac_address}`);

        if (dhcp) {
            this._dhcpDialog.setEnable(dhcp.enable);
            this._dhcpDialog.setRangeStart(dhcp.range_start ?? '');
            this._dhcpDialog.setRangeEnd(dhcp.range_end ?? '');
            this._dhcpDialog.setLeaseTime(dhcp.lease_time ?? 3600);
            this._dhcpDialog.setGateway(dhcp.gateway ?? iface.ipv4_address ?? '');
            this._dhcpDialog.setDnsServer(dhcp.dns_server ?? '');
            this._dhcpDialog.setDomain(dhcp.domain ?? '');
            this._dhcpDialog.setRaEnable(dhcp.ra_enable ?? false);
        } else {
            this._dhcpDialog.setGateway(iface.ipv4_address ?? '');
        }

        this._dhcpDialog.show();
    }

    /**
     * Confirm + delete an interface.
     * @param iface - the interface to delete
     * @protected
     */
    protected _confirmDelete(iface: NetworkInterfaceEntry): void {
        DialogConfirm.confirm(
            'routerInterfaceDelete', ModalDialogType.large, 'Delete interface',
            `Delete the interface "${iface.name || iface.mac_address}"?`,
            async(_, dialog) => {
                try {
                    if (await RouterAPI.deleteInterface(iface.id)) {
                        this._toast.fire({icon: 'success', title: 'Interface deleted.'});
                    }
                } catch (message) {
                    this._toast.fire({icon: 'error', title: message});
                }

                dialog.hide();
                await this._reload();
            }, undefined, 'Delete'
        );
    }

}
