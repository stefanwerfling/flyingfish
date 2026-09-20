import {ButtonMenu, ButtonType, IconFa} from 'bambooo';
import {DhcpLeaseEntry, DhcpServerConfigEntry, WanLeaseEntry} from 'flyingfish_schemas';

/**
 * Menu actions a card can offer (wired by the Router page).
 */
export type InterfaceCardActions = {
    onEdit?: () => void;
    onDelete?: () => void;
    onAssign?: () => void;
    onEditDhcp?: () => void;
};

/**
 * A flattened view of one interface for {@link InterfaceCard} — the Router page builds it
 * from the overview (configured interface + its DHCP config / leases, or a detected NIC).
 */
export type InterfaceView = {
    mac: string;
    name: string;
    role: string;
    up: boolean;
    disabled: boolean;
    configured: boolean;
    ipv4: string;
    ipv4note: string;
    ipv6?: string;
    laneColor: string;
    dhcp?: DhcpServerConfigEntry | null;
    ipv6mode?: string;
    leases?: DhcpLeaseEntry[];
    wanLease?: WanLeaseEntry | null;
    nat44?: boolean;
    forward?: boolean;
    actions: InterfaceCardActions;
};

/**
 * InterfaceCard — one self-contained card per network interface (Pi-router UI v2). Shows
 * status, role, addressing, and role-specific detail INLINE: a WAN card shows its uplink
 * lease + NAT/forwarding; a LAN card shows its own DHCP server (pool as a bar within the
 * subnet), IPv6 mode and active clients; a detected-but-unconfigured NIC shows an
 * "assign role" call to action. Replaces the flat interface table + the global status card.
 */
export class InterfaceCard {

    /**
     * @param parent - the grid element to render into
     * @param view - the flattened interface view
     */
    public constructor(parent: JQuery, view: InterfaceView) {
        const card = jQuery('<div class="ffr-card"></div>').appendTo(parent);

        // ---- header ------------------------------------------------------------------------------------------------
        const top = jQuery('<div class="ffr-top"></div>').appendTo(card);
        const ledClass = !view.configured ? (view.up ? 'up' : 'idle') : (view.disabled ? 'idle' : (view.up ? 'up' : 'down'));
        jQuery(`<span class="ffr-led ${ledClass}"></span>`).appendTo(top);

        const info = jQuery('<div style="min-width:0"></div>').appendTo(top);
        const nameRow = jQuery('<div class="ffr-name"></div>').appendTo(info);
        jQuery(`<b>${InterfaceCard._esc(view.name || view.mac)}</b>`).appendTo(nameRow);

        if (view.configured && view.role !== 'unassigned') {
            const bg = view.role === 'wan' ? 'var(--ffr-wan)' : view.laneColor;
            jQuery(`<span class="ffr-role" style="background:${bg}">${InterfaceCard._esc(view.role)}</span>`).appendTo(nameRow);
        } else {
            jQuery('<span class="ffr-role idle">available</span>').appendTo(nameRow);
        }

        jQuery(`<div class="ffr-name"><span class="ffr-macx">${InterfaceCard._esc(view.mac)}</span></div>`).appendTo(info);
        jQuery(`<div class="ffr-ip">${InterfaceCard._esc(view.ipv4)}<span class="ffr-modex">${InterfaceCard._esc(view.ipv4note)}</span></div>`).appendTo(info);

        if (view.ipv6) {
            jQuery(`<div class="ffr-ip ffr-ip6">${InterfaceCard._esc(view.ipv6)}</div>`).appendTo(info);
        }

        // ---- menu --------------------------------------------------------------------------------------------------
        const menuWrap = jQuery('<div class="ffr-menu"></div>').appendTo(top);
        const menu = new ButtonMenu(menuWrap[0] as unknown as HTMLElement, IconFa.bars, true, ButtonType.borderless);

        if (view.configured) {
            if (view.actions.onEdit) {
                menu.addMenuItem('Edit interface', view.actions.onEdit, IconFa.edit);
            }

            if (view.role === 'lan' && view.actions.onEditDhcp) {
                menu.addMenuItem('Edit DHCP server', view.actions.onEditDhcp, IconFa.edit);
            }

            if (view.actions.onDelete) {
                menu.addDivider();
                menu.addMenuItem('Delete', view.actions.onDelete, IconFa.trash);
            }
        } else if (view.actions.onAssign) {
            menu.addMenuItem('Assign role', view.actions.onAssign, IconFa.add);
        }

        // ---- body: role-specific --------------------------------------------------------------------------------
        if (!view.configured) {
            const assign = jQuery('<div class="ffr-assign"></div>').appendTo(card);
            jQuery('<p>Detected, but not part of the router yet. Give it a role to make it a WAN uplink or its own LAN network.</p>').appendTo(assign);
            const btn = jQuery('<button class="btn btn-primary btn-sm">Assign role →</button>').appendTo(assign);

            if (view.actions.onAssign) {
                btn.on('click', view.actions.onAssign);
            }

            return;
        }

        if (view.role === 'wan') {
            this._wanSections(card, view);
        } else if (view.role === 'lan') {
            this._lanSections(card, view);
        }
    }

    /**
     * WAN card body: the uplink lease + forwarding/NAT badges.
     * @param card - the card element
     * @param view - the interface view
     */
    protected _wanSections(card: JQuery, view: InterfaceView): void {
        const wan = view.wanLease ?? null;
        const lease = jQuery('<div class="ffr-sec"></div>').appendTo(card);
        jQuery('<div class="ffr-sec-hd"><span class="ffr-eyebrow">Uplink lease</span></div>').appendTo(lease);
        InterfaceCard._kv(lease, [
            ['Gateway', wan ? wan.gateway : '—'],
            ['DNS', wan ? wan.dns_servers : '—'],
            ['IPv6 prefix (PD)', wan && wan.ipv6_prefix ? wan.ipv6_prefix : '—']
        ]);

        const nat = jQuery('<div class="ffr-sec"></div>').appendTo(card);
        jQuery('<div class="ffr-sec-hd"><span class="ffr-eyebrow">Forwarding &amp; NAT</span></div>').appendTo(nat);
        const badges = jQuery('<div style="display:flex;gap:8px;flex-wrap:wrap"></div>').appendTo(nat);
        jQuery(`<span class="ffr-pill ${view.forward ? 'on' : 'off'}">forwarding ${view.forward ? 'on' : 'off'}</span>`).appendTo(badges);
    }

    /**
     * LAN card body: DHCP server (pool bar), IPv6 mode, and the active clients.
     * @param card - the card element
     * @param view - the interface view
     */
    protected _lanSections(card: JQuery, view: InterfaceView): void {
        const dhcp = view.dhcp ?? null;

        // DHCP server
        const dhcpSec = jQuery('<div class="ffr-sec"></div>').appendTo(card);
        const dhcpHd = jQuery('<div class="ffr-sec-hd"></div>').appendTo(dhcpSec);
        jQuery(`<span class="ffr-eyebrow"><span class="ffr-dot" style="background:${view.laneColor}"></span>DHCP server</span>`).appendTo(dhcpHd);
        jQuery(`<span class="ffr-pill ${dhcp?.enable ? 'on' : 'off'}">${dhcp?.enable ? 'on' : 'off'}</span>`).appendTo(dhcpHd);

        if (dhcp) {
            InterfaceCard._kv(dhcpSec, [
                ['Lease time', `${dhcp.lease_time ?? 0}s`],
                ['DNS handed out', dhcp.dns_server ?? '—'],
                ['Domain', dhcp.domain ? dhcp.domain : '—']
            ]);
            this._poolBar(dhcpSec, view, dhcp);
        } else {
            jQuery('<div class="ffr-empty">No DHCP server configured — use the menu to set one up.</div>').appendTo(dhcpSec);
        }

        // IPv6 mode
        const v6 = view.ipv6mode ?? 'off';
        const v6sec = jQuery('<div class="ffr-sec"></div>').appendTo(card);
        const v6hd = jQuery('<div class="ffr-sec-hd"><span class="ffr-eyebrow">IPv6 + NAT</span></div>').appendTo(v6sec);
        const v6label = v6 === 'nat66' ? 'NAT66 · ULA' : (v6 === 'pd' ? 'PD · delegated /64' : 'off');
        jQuery(`<span class="ffr-badge v6">${v6label}</span>`).appendTo(v6hd);
        const v4hd = jQuery(`<span class="ffr-badge v4" style="margin-left:6px">${view.nat44 ? 'NAT44' : 'no NAT44'}</span>`);
        v6hd.find('.ffr-eyebrow').after(v4hd);

        // Clients
        const leases = view.leases ?? [];
        const cSec = jQuery('<div class="ffr-sec"></div>').appendTo(card);
        jQuery(`<div class="ffr-sec-hd"><span class="ffr-eyebrow">Leases · ${leases.length} client${leases.length === 1 ? '' : 's'}</span></div>`).appendTo(cSec);

        if (leases.length === 0) {
            jQuery('<div class="ffr-empty">No active leases.</div>').appendTo(cSec);
        } else {
            const list = jQuery('<div class="ffr-clients"></div>').appendTo(cSec);

            for (const lease of leases) {
                jQuery(
                    '<div class="ffr-client">' +
                    '<span class="ffr-cico">🖥️</span>' +
                    `<span class="ffr-chost">${InterfaceCard._esc(lease.hostname || 'unknown')}</span>` +
                    `<span class="ffr-cmac">${InterfaceCard._esc(lease.mac_address)}</span>` +
                    `<span class="ffr-cip">${InterfaceCard._esc(lease.ip_address)}</span>` +
                    '</div>'
                ).appendTo(list);
            }
        }
    }

    /**
     * Draw the DHCP pool as a bar within the /24 (start..end of the last octet).
     * @param parent - the section element
     * @param view - the interface view
     * @param dhcp - the DHCP config
     */
    protected _poolBar(parent: JQuery, view: InterfaceView, dhcp: DhcpServerConfigEntry): void {
        const start = InterfaceCard._lastOctet(dhcp.range_start ?? '');
        const end = InterfaceCard._lastOctet(dhcp.range_end ?? '');

        if (start < 0 || end < start) {
            return;
        }

        const left = (start / 255) * 100;
        const width = Math.max(2, ((end - start) / 255) * 100);
        const scale = jQuery('<div class="ffr-scale"></div>').appendTo(parent);
        jQuery(
            `<div class="ffr-track"><div class="ffr-fill" style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%;background:${view.laneColor}"></div></div>`
        ).appendTo(scale);
        jQuery(
            `<div class="ffr-cap"><span>.1</span><span>pool .${start} – .${end}</span><span>.254</span></div>`
        ).appendTo(scale);
    }

    /**
     * Append a key/value grid.
     * @param parent - the container
     * @param rows - [label, value] pairs
     */
    protected static _kv(parent: JQuery, rows: [string, string][]): void {
        const dl = jQuery('<dl class="ffr-kv"></dl>').appendTo(parent);

        for (const row of rows) {
            jQuery(`<dt>${InterfaceCard._esc(row[0])}</dt><dd>${InterfaceCard._esc(row[1])}</dd>`).appendTo(dl);
        }
    }

    /**
     * The last octet of a dotted IPv4 (or -1 if not parseable).
     * @param ip - the address
     */
    protected static _lastOctet(ip: string): number {
        const match = (/(\d+)\s*$/u).exec(ip.trim());

        return match ? Math.min(255, parseInt(match[1], 10)) : -1;
    }

    /**
     * Escape a value for safe HTML insertion.
     * @param value - the raw value
     */
    protected static _esc(value: string): string {
        return String(value).replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
    }

}
