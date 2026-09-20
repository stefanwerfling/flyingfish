import {RouterOverviewResponse} from 'flyingfish_schemas';

/**
 * RouteCanvas — the interactive routing map on the Router page (Pi-router UI v2). Draws
 * the traffic path Internet → FlyingFish router → each LAN segment → its clients as a
 * data-driven SVG, with the NAT44 / NAT66 / PD mode shown per flow. Hovering a segment
 * highlights its whole path and shows a detail popover. Replaces the old standalone
 * "NAT / DHCP / WAN status" card + the jsNGraph graph.
 */
export class RouteCanvas {

    protected _root: JQuery;

    protected _svgWrap: JQuery;

    protected _pop: JQuery;

    protected readonly _lanColors = ['var(--ffr-lan0)', 'var(--ffr-lan1)', 'var(--ffr-lan2)', 'var(--ffr-lan3)'];

    /**
     * @param parent - the container element to render into
     */
    public constructor(parent: JQuery) {
        this._root = jQuery('<div class="ffr-canvas"></div>').appendTo(parent);

        const head = jQuery('<div class="ffr-canvas-head"></div>').appendTo(this._root);
        jQuery('<div class="ffr-eyebrow">Routing map</div>').appendTo(head);
        jQuery(
            '<div class="ffr-legend">' +
            '<span><i style="background:var(--ffr-v4)"></i>IPv4 · NAT44</span>' +
            '<span><i style="background:var(--ffr-v6)"></i>IPv6 · NAT66 / PD</span>' +
            '<span><i style="background:var(--ffr-idle)"></i>no NAT</span>' +
            '</div>'
        ).appendTo(head);

        this._svgWrap = jQuery('<div class="ffr-canvas-scroll"></div>').appendTo(this._root);
        this._pop = jQuery('<div class="ffr-pop"></div>').appendTo(this._root);
    }

    /**
     * Render/refresh the map from the current overview.
     * @param overview - the loaded router overview
     */
    public update(overview: RouterOverviewResponse): void {
        const wanIface = overview.interfaces.find((entry) => entry.role === 'wan' && !(entry.disable ?? false));
        const lans = overview.interfaces.filter((entry) => entry.role === 'lan' && !(entry.disable ?? false));
        const wan = overview.wanLease;

        // Prefer the LIVE discovered WAN address (interface scan) over the reported DHCP
        // lease, which can lag behind after an uplink change (the lease report is separate
        // from interface discovery). Falls back to the lease, then to a status label.
        const wanLive = wanIface
            ? (overview.availableInterfaces ?? []).find((entry) => entry.mac.toLowerCase() === wanIface.mac_address.toLowerCase())
            : undefined;
        const wanV4 = wanLive?.ipv4 ?? (wan && wan.ipv4_address ? `${wan.ipv4_address}/${wan.ipv4_prefix}` : '');
        const wanV6 = wanLive?.ipv6 ?? (wan?.ipv6_prefix ?? '');

        const height = Math.max(210, lans.length * 78 + 34);
        const routerY = Math.round(height / 2);
        const parts: string[] = [];
        const pop: Record<string, {title: string; color: string; rows: [string, string][];}> = {};

        // Internet / WAN uplink. The box is wide enough for a full IPv4; the IPv6 GUA is
        // shortened on the node (full value in the hover popover) so nothing overflows.
        const wanSub = wanV4 !== '' ? wanV4 : (wanIface ? 'no lease' : 'no WAN set');
        parts.push(
            `<g class="ffr-seg" data-seg="wan">` +
            `<rect x="14" y="${routerY - 39}" width="176" height="78" rx="10" fill="var(--ffr-surface2)" stroke="var(--ffr-line)"/>` +
            `<text x="28" y="${routerY - 16}" font-size="12.5" font-weight="700" fill="var(--ffr-ink)">🌐 Internet</text>` +
            `<text x="28" y="${routerY + 2}" class="ffr-mono" font-size="11" fill="var(--ffr-soft)">${RouteCanvas._esc(wanSub)}</text>` +
            (wanV6 ? `<text x="28" y="${routerY + 17}" class="ffr-mono" font-size="9.5" fill="var(--ffr-v6)">${RouteCanvas._esc(RouteCanvas._shortV6(wanV6))}</text>` : '') +
            `<text x="28" y="${routerY + 31}" font-size="9.5" fill="var(--ffr-faint)">${wanIface ? RouteCanvas._esc(wanIface.name ?? '') + ' · WAN' : 'assign a WAN'}</text>` +
            `</g>`
        );
        pop.wan = {
            title: '🌐 Internet uplink', color: 'var(--ffr-wan)',
            rows: [
                ['Interface', wanIface ? (wanIface.name ?? '-') + ' · WAN' : 'none'],
                ['Address', wanV4 !== '' ? wanV4 : '—'],
                ['Gateway', wan && wan.gateway ? wan.gateway : '—'],
                ['IPv6', wanV6 !== '' ? wanV6 : '—']
            ]
        };

        // Router spine
        const anyNat = lans.some((lan) => lan.nat44_enabled);
        parts.push(
            `<g class="ffr-seg" data-seg="router">` +
            `<rect x="300" y="${routerY - 33}" width="118" height="66" rx="12" fill="var(--ffr-accent)"/>` +
            `<text x="359" y="${routerY - 9}" text-anchor="middle" font-size="13" font-weight="720" fill="#fff">FlyingFish</text>` +
            `<text x="359" y="${routerY + 8}" text-anchor="middle" font-size="9.5" fill="#eafbff">router · ${overview.natPolicy?.forward_enabled ? 'forwarding on' : 'forwarding off'}</text>` +
            `<text x="359" y="${routerY + 23}" text-anchor="middle" font-size="9" fill="#d6f6fb">${anyNat ? 'NAT active' : 'no NAT'}</text>` +
            `</g>`
        );
        pop.router = {
            title: 'FlyingFish router', color: 'var(--ffr-accent)',
            rows: [
                ['Role', 'forwarding router'],
                ['Forwarding', overview.natPolicy?.forward_enabled ? 'on' : 'off'],
                ['LAN segments', `${lans.length}`],
                ['WAN', wanIface ? (wanIface.name ?? '-') : 'none']
            ]
        };

        // WAN <-> router flow
        parts.push(`<g class="ffr-seg" data-seg="wan"><path class="ffr-flow" d="M190 ${routerY} H300" stroke="var(--ffr-wan)"/></g>`);

        // LAN segments
        lans.forEach((lan, index) => {
            const color = this._lanColors[index % this._lanColors.length];
            const laneY = 30 + index * 78;
            const laneCenter = laneY + 23;
            const key = `lan${index}`;
            const name = lan.name || `lan ${lan.id}`;
            const ipv4 = lan.ipv4_address ? `${lan.ipv4_address}/${lan.ipv4_prefix ?? 24}` : 'lan';
            const clients = overview.leases.filter((entry) => entry.interface === (lan.name || ''));
            const nat44 = lan.nat44_enabled ?? false;
            const ipv6 = lan.ipv6_mode ?? 'off';

            const v6flow = ipv6 === 'off' ? 'var(--ffr-idle)' : 'var(--ffr-v6)';
            const flows =
                `<path class="ffr-flow" d="M418 ${routerY - 6} C 479 ${routerY - 6} 479 ${laneCenter - 9} 540 ${laneCenter - 9}" stroke="${nat44 ? 'var(--ffr-v4)' : 'var(--ffr-idle)'}"/>` +
                `<path class="ffr-flow" d="M418 ${routerY + 6} C 479 ${routerY + 6} 479 ${laneCenter + 9} 540 ${laneCenter + 9}" stroke="${v6flow}"/>`;

            const v4badge = nat44
                ? `<g transform="translate(462,${laneCenter - 26})"><rect width="40" height="15" rx="4" fill="var(--ffr-v4)"/><text x="20" y="11" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">NAT44</text></g>`
                : '';
            const v6label = ipv6 === 'nat66' ? 'NAT66' : (ipv6 === 'pd' ? 'PD' : '');
            const v6badge = v6label
                ? `<g transform="translate(462,${laneCenter + 12})"><rect width="${v6label === 'PD' ? 30 : 40}" height="15" rx="4" fill="var(--ffr-v6)"/><text x="${v6label === 'PD' ? 15 : 20}" y="11" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${v6label}</text></g>`
                : '';

            const dots = clients.slice(0, 6)
                .map((_c, di) => `<circle cx="${724 - di * 11}" cy="${laneCenter - 4}" r="4" fill="${color}"/>`)
                .join('');

            parts.push(
                `<g class="ffr-seg" data-seg="${key}">` +
                flows + v4badge + v6badge +
                `<rect x="540" y="${laneY}" width="206" height="46" rx="9" fill="color-mix(in srgb, ${color} 13%, var(--ffr-surface))" stroke="${color}"/>` +
                `<rect x="540" y="${laneY}" width="5" height="46" rx="2" fill="${color}"/>` +
                `<text x="556" y="${laneCenter - 5}" font-size="12" font-weight="700" fill="var(--ffr-ink)">${RouteCanvas._esc(name)} · LAN</text>` +
                `<text x="556" y="${laneCenter + 11}" class="ffr-mono" font-size="11" fill="var(--ffr-soft)">${RouteCanvas._esc(ipv4)}</text>` +
                `<text x="700" y="${laneCenter - 5}" text-anchor="end" font-size="9.5" fill="var(--ffr-faint)">${clients.length} client${clients.length === 1 ? '' : 's'}</text>` +
                dots +
                `</g>`
            );

            pop[key] = {
                title: `${name} · LAN`, color: color,
                rows: [
                    ['Subnet', ipv4],
                    ['NAT44', nat44 ? 'on' : 'off'],
                    ['IPv6', ipv6 === 'nat66' ? 'NAT66' : (ipv6 === 'pd' ? 'PD · routed' : 'off')],
                    ['Clients', `${clients.length} leased`]
                ]
            };
        });

        const svg = `<svg class="ffr-route" viewBox="0 0 760 ${height}" style="min-width:720px;height:${height}px" role="img" aria-label="Routing map">${parts.join('')}</svg>`;
        this._svgWrap.html(svg);
        this._bindHover(pop);
    }

    /**
     * Wire hover highlighting + the detail popover on every segment group.
     * @param pop - the per-segment popover data
     */
    protected _bindHover(pop: Record<string, {title: string; color: string; rows: [string, string][];}>): void {
        const svg = this._svgWrap.find('svg');
        const groups = svg.find('[data-seg]');
        const rootEl = this._root.get(0) as HTMLElement;

        const clear = (): void => {
            svg.find('.ffr-seg').removeClass('ffr-dim ffr-hot');
            this._pop.removeClass('ffr-show');
        };

        groups.on('mousemove', (event: JQuery.MouseMoveEvent): void => {
            const key = jQuery(event.currentTarget).attr('data-seg') ?? '';
            const data = pop[key];

            if (!data) {
                return;
            }

            svg.find('.ffr-seg').each((_i, node): void => {
                const nkey = jQuery(node).attr('data-seg');
                const same = nkey === key;
                jQuery(node).toggleClass('ffr-hot', same);
                jQuery(node).toggleClass('ffr-dim', key !== 'router' && !same);
            });

            if (key === 'router') {
                svg.find('.ffr-seg').removeClass('ffr-dim');
            }

            this._pop.html(
                `<h4><span class="ffr-dot" style="background:${data.color}"></span>${RouteCanvas._esc(data.title)}</h4><dl>` +
                data.rows.map((row) => `<dt>${RouteCanvas._esc(row[0])}</dt><dd>${RouteCanvas._esc(row[1])}</dd>`).join('') +
                `</dl>`
            );

            const rect = rootEl.getBoundingClientRect();
            let x = event.clientX - rect.left + 14;
            const y = event.clientY - rect.top + 12;
            x = Math.min(x, rect.width - 272);
            this._pop.css({left: `${Math.max(6, x)}px`, top: `${y}px`}).addClass('ffr-show');
        });

        groups.on('mouseleave', clear);
    }

    /**
     * Escape a value for safe insertion into SVG/HTML text.
     * @param value - the raw value
     */
    protected static _esc(value: string): string {
        return String(value).replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
    }

    /**
     * Shorten a long IPv6 address for the compact node label: keep the first four groups
     * and append `…` (the full value stays in the hover popover). A `…/64`-style prefix or
     * a short address is returned unchanged.
     * @param value - the IPv6 address or prefix
     */
    protected static _shortV6(value: string): string {
        if (value.length <= 22) {
            return value;
        }

        const groups = value.split(':');

        if (groups.length <= 4) {
            return value;
        }

        return `${groups.slice(0, 4).join(':')}…`;
    }

}
