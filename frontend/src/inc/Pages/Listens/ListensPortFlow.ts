import {ListenTypes} from '../../Api/Listen.js';
import '../Router/router.css';
import './portflow.css';

/**
 * The minimal listen shape the diagram needs (a subset of the Listen API entry).
 */
export type PortFlowListen = {
    id: number;
    port: number;
    type: number;
    name: string;
    description?: string;
    protocol?: number;
    enable_ipv6?: boolean;
    proxy_protocol?: boolean;
    proxy_protocol_in?: boolean;
    check_address?: boolean;
    check_address_type?: number;
    disable?: boolean;
};

/**
 * Per-segment hover popover data.
 */
type PopData = {title: string; color: string; rows: [string, string][];};

/**
 * ListensPortFlow — the Listens page's interactive port-flow map, built with the same
 * technique as the Router page's {@link RouteCanvas}: a data-driven SVG whose listen
 * segments highlight on hover (thicken the flow, dim the rest) and show a detail popover,
 * and open the edit dialog on click. External stream listeners enter on the left, run down
 * nginx's visible L4 stream stage (ssl_preread → IP access → domain split), and route to
 * the DNS server / internal L7 http servers and on to the backends.
 */
export class ListensPortFlow {

    protected readonly _root: JQuery;

    protected readonly _canvas: JQuery;

    protected readonly _pop: JQuery;

    protected _onEdit: ((listen: PortFlowListen) => void) | null;

    protected _byId: Map<string, PortFlowListen> = new Map();

    /**
     * @param parent - the element to render into
     * @param onEdit - opens the edit dialog for a clicked listen
     */
    public constructor(parent: JQuery, onEdit?: (listen: PortFlowListen) => void) {
        this._onEdit = onEdit ?? null;
        this._root = jQuery('<div class="ffr ffr-portflow"></div>').appendTo(parent);
        const panel = jQuery('<div class="pf-panel"></div>').appendTo(this._root);

        const head = jQuery('<div class="pf-head"></div>').appendTo(panel);
        jQuery('<div><div class="pf-eyebrow">Port flow</div><div class="pf-title">How these listeners route through FlyingFish</div></div>').appendTo(head);
        jQuery('<div class="pf-legend">'
            + '<span><i style="background:var(--dns)"></i>DNS</span>'
            + '<span><i style="background:var(--http)"></i>HTTP</span>'
            + '<span><i style="background:var(--https)"></i>HTTPS</span>'
            + '<span><i style="background:var(--proxy)"></i>to backend</span>'
            + '</div>').appendTo(head);

        this._canvas = jQuery('<div class="pf-canvas"></div>').appendTo(panel);
        this._pop = jQuery('<div class="ffr-pop"></div>').appendTo(this._canvas);
    }

    /**
     * Render/refresh the map from the current listen list.
     * @param listens - the node's listens
     */
    public setData(listens: PortFlowListen[]): void {
        const order = (l: PortFlowListen): number => ({dns: 0, http: 1, https: 2, other: 3})[ListensPortFlow._kind(l)];
        const streams = listens.filter((l) => l.type === ListenTypes.stream).sort((a, b) => order(a) - order(b));
        const https = listens.filter((l) => l.type === ListenTypes.http).sort((a, b) => order(a) - order(b));
        const anyAccess = streams.some((l) => l.check_address === true);

        this._byId.clear();
        this._canvas.find('svg').remove();

        if (streams.length === 0) {
            this._canvas.append('<div class="pf-empty">No stream listeners yet — add one to see the flow.</div>');
            return;
        }

        this._canvas.find('.pf-empty').remove();
        const pop: Record<string, PopData> = {};
        const svg = this._build(streams, https, anyAccess, pop);
        this._pop.before(svg);
        this._bind(pop);
    }

    /**
     * Classify a listen by protocol for colouring (heuristic on port/name).
     * @param l - the listen
     * @protected
     */
    protected static _kind(l: PortFlowListen): 'dns' | 'https' | 'http' | 'other' {
        const n = (l.name || '').toLowerCase();

        if (l.port === 53 || n.includes('dns')) {
            return 'dns';
        }

        if (l.port === 443 || l.port === 10443 || n.includes('https') || n.includes('ssl')) {
            return 'https';
        }

        if (l.port === 80 || l.port === 10080 || n.includes('http')) {
            return 'http';
        }

        return 'other';
    }

    /**
     * The stroke colour token for a kind.
     * @param kind - protocol kind
     * @protected
     */
    protected static _color(kind: string): string {
        switch (kind) {
            case 'dns': return 'var(--dns)';
            case 'https': return 'var(--https)';
            case 'http': return 'var(--http)';
            default: return 'var(--accent)';
        }
    }

    /**
     * The options chips text for a listen (IP6 / proxy / IP access).
     * @param l - the listen
     * @protected
     */
    protected static _options(l: PortFlowListen): string {
        const opt: string[] = [];

        if (l.enable_ipv6) {
            opt.push('IPv6');
        }

        if (l.proxy_protocol) {
            opt.push('proxy');
        }

        if (l.proxy_protocol_in) {
            opt.push('proxy-in');
        }

        if (l.check_address) {
            opt.push('IP access');
        }

        return opt.length > 0 ? opt.join(', ') : '—';
    }

    /**
     * Symmetric vertical centres for a stacked column of `n` nodes around `centerY`.
     * @param n - node count
     * @param centerY - the column's vertical centre
     * @param rowH - row height
     * @protected
     */
    protected static _stackYs(n: number, centerY: number, rowH: number): number[] {
        const first = centerY - ((n - 1) / 2) * rowH;
        const ys: number[] = [];

        for (let i = 0; i < n; i++) {
            ys.push(first + (i * rowH));
        }

        return ys;
    }

    /**
     * Escape text for safe SVG interpolation.
     * @param v - raw text
     * @protected
     */
    protected static _esc(v: string): string {
        return String(v).replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
    }

    /**
     * Build the SVG markup + collect the per-segment popover data.
     * @param streams - external stream listens (ingress)
     * @param https - internal http listens (L7 servers)
     * @param anyAccess - whether any stream enables the IP access check
     * @param pop - out: per-segment popover data (keyed by data-seg)
     * @protected
     */
    protected _build(streams: PortFlowListen[], https: PortFlowListen[], anyAccess: boolean, pop: Record<string, PopData>): string {
        const W = 1040;
        const rowH = 104;
        const hasDns = streams.some((s) => ListensPortFlow._kind(s) === 'dns');
        const destCount = https.length + (hasDns ? 1 : 0);
        const nRows = Math.max(streams.length, destCount, 3);
        const topPad = 104;
        const H = topPad + (nRows * rowH) + 24;
        const centerY = topPad + ((nRows * rowH) / 2);

        // columns (left → right): internet · ports · nginx L4 band · destinations · backends
        const inR = 120;
        const portX = 160; const portW = 108; const portH = 42; const portR = portX + portW;
        const bandX = 334; const bandW = 168; const bandR = bandX + bandW;
        const destX = 540; const destW = 124; const destH = 44; const destR = destX + destW;
        const backX = 850; const backW = 120; const backH = 46;
        const stepX = 352; const stepW = 132; const stepH = 38; const stepCx = stepX + (stepW / 2);
        const s1 = centerY - 58; const s2 = centerY; const s3 = centerY + 58;

        const e: string[] = [];

        e.push('<defs>'
            + ListensPortFlow._marker('m-dns', 'var(--dns)')
            + ListensPortFlow._marker('m-http', 'var(--http)')
            + ListensPortFlow._marker('m-https', 'var(--https)')
            + ListensPortFlow._marker('m-proxy', 'var(--proxy)')
            + ListensPortFlow._marker('m-accent', 'var(--accent)')
            + '</defs>');

        // nested containers (never dimmed)
        const cBot = H - 14;
        e.push(ListensPortFlow._frame(12, 20, W - 24, cBot - 20, 'var(--c-your)', 'Your network', 'end'));
        e.push(ListensPortFlow._frame(150, 42, 545, cBot - 42, 'var(--c-docker)', 'Docker · network', 'start'));
        e.push(ListensPortFlow._frame(300, 64, 380, cBot - 64, 'var(--c-ff)', 'Docker · FlyingFish', 'start'));
        e.push(ListensPortFlow._frame(bandX, 86, bandW, cBot - 86, 'var(--c-nginx)', 'nginx · stream L4', 'start'));

        // internet + the nginx L4 stage (steps shown INSIDE the band; lanes pass through it,
        // so the arrows stay straight and the L4 sequence stays visible)
        e.push(ListensPortFlow._box(28, centerY - 26, 92, 52, 'var(--faint)', 'var(--surface2)'));
        e.push(`<text class="pf-node-lbl" x="74" y="${centerY - 2}" text-anchor="middle">Internet</text>`);
        e.push(`<text class="pf-node-sub" x="74" y="${centerY + 12}" text-anchor="middle">clients</text>`);
        e.push(ListensPortFlow._step(stepX, s1 - (stepH / 2), stepW, stepH, 'ssl_preread', 'protocol · SNI'));
        e.push(ListensPortFlow._step(stepX, s2 - (stepH / 2), stepW, stepH, 'IP access check', anyAccess ? 'active' : 'opt-in'));
        e.push(ListensPortFlow._step(stepX, s3 - (stepH / 2), stepW, stepH, 'domain split', 'by SNI'));
        e.push(`<path class="pf-l4" d="M${stepCx},${s1 + (stepH / 2)} V${s2 - (stepH / 2)}" marker-end="url(#m-accent)"/>`);
        e.push(`<path class="pf-l4" d="M${stepCx},${s2 + (stepH / 2)} V${s3 - (stepH / 2)}" marker-end="url(#m-accent)"/>`);

        // destination Y positions (DNS server first, then http L7 nodes) + per-kind lookup
        const destYs = ListensPortFlow._stackYs(destCount, centerY, rowH);
        const dnsY = hasDns ? destYs[0] : centerY;
        const httpYs: number[] = [];
        https.forEach((_h, i) => httpYs.push(destYs[hasDns ? i + 1 : i]));
        const kindDestY = (kind: string): number => {
            if (kind === 'dns') {
                return dnsY;
            }

            const idx = https.findIndex((h) => ListensPortFlow._kind(h) === kind);
            return idx >= 0 ? httpYs[idx] : centerY;
        };

        // DNS server node (informational, not a listen entry)
        if (hasDns) {
            e.push(ListensPortFlow._box(destX, dnsY - (destH / 2), destW, destH, 'var(--dns)', 'var(--surface2)'));
            e.push(`<text class="pf-node-lbl" x="${destX + (destW / 2)}" y="${dnsY - 2}" text-anchor="middle">DNS server</text>`);
            e.push(`<text class="pf-node-sub" x="${destX + (destW / 2)}" y="${dnsY + 13}" text-anchor="middle">:53</text>`);
        }

        // ---- ingress stream segments (hover + click) ----
        const portYs = ListensPortFlow._stackYs(streams.length, centerY, rowH);
        streams.forEach((s, i) => {
            const y = portYs[i];
            const kind = ListensPortFlow._kind(s);
            const col = ListensPortFlow._color(kind);
            const mk = ListensPortFlow._markerId(kind);
            const key = `s${s.id}`;
            this._byId.set(key, s);
            const dy = kindDestY(kind);

            e.push(`<g class="ffr-seg" data-seg="${key}">`
                + `<path class="ffr-flow" style="stroke:${col}" d="M${inR},${centerY} C${inR + 20},${centerY} ${portX - 22},${y} ${portX - 2},${y}" marker-end="url(#${mk})"/>`
                + `<path class="ffr-flow" style="stroke:${col}" d="M${portR},${y} H${bandX - 2}" marker-end="url(#${mk})"/>`
                + `<path class="ffr-flow" style="stroke:${col}" d="M${bandR + 2},${dy} H${destX - 2}" marker-end="url(#${mk})"/>`
                + ListensPortFlow._box(portX, y - (portH / 2), portW, portH, col, `color-mix(in srgb, ${col} 15%, var(--surface))`, s.disable === true)
                + `<text class="pf-port" x="${portX + (portW / 2)}" y="${y - 1}" text-anchor="middle">:${s.port}</text>`
                + `<text class="pf-node-sub" x="${portX + (portW / 2)}" y="${y + 12}" text-anchor="middle">${kind} · stream</text>`
                + `</g>`);

            pop[key] = {
                title: `:${s.port} · ${s.name}`,
                color: col,
                rows: [
                    ['Type', 'stream · L4'],
                    ['Port', `${s.port}`],
                    ['Routes to', kind === 'dns' ? 'DNS server' : (kind === 'https' ? ':10443 (https L7)' : ':10080 (http L7)')],
                    ['Options', ListensPortFlow._options(s)],
                    ['State', s.disable ? 'disabled' : 'enabled']
                ]
            };
        });

        // ---- L7 http server segments (hover + click) → backend ----
        https.forEach((h, i) => {
            const y = httpYs[i];
            const kind = ListensPortFlow._kind(h);
            const key = `h${h.id}`;
            this._byId.set(key, h);

            e.push(`<g class="ffr-seg" data-seg="${key}">`
                + `<path class="ffr-flow" style="stroke:var(--proxy)" d="M${destR},${y} H${backX - 2}" marker-end="url(#m-proxy)"/>`
                + ListensPortFlow._box(destX, y - (destH / 2), destW, destH, 'var(--proxy)', 'color-mix(in srgb, var(--proxy) 13%, var(--surface))', h.disable === true)
                + `<text class="pf-port" x="${destX + (destW / 2)}" y="${y - 1}" text-anchor="middle">:${h.port}</text>`
                + `<text class="pf-node-sub" x="${destX + (destW / 2)}" y="${y + 12}" text-anchor="middle">${kind === 'https' ? 'https · L7' : 'http · L7'}</text>`
                + ListensPortFlow._box(backX, y - (backH / 2), backW, backH, 'var(--proxy)', 'var(--surface2)')
                + `<text class="pf-node-lbl" x="${backX + (backW / 2)}" y="${y - 1}" text-anchor="middle">${kind === 'https' ? 'HTTPS' : 'HTTP'}</text>`
                + `<text class="pf-node-sub" x="${backX + (backW / 2)}" y="${y + 12}" text-anchor="middle">backend</text>`
                + `</g>`);

            pop[key] = {
                title: `:${h.port} · ${h.name}`,
                color: 'var(--proxy)',
                rows: [
                    ['Type', 'http · L7'],
                    ['Port', `${h.port}`],
                    ['Role', 'TLS · host · location'],
                    ['Options', ListensPortFlow._options(h)],
                    ['State', h.disable ? 'disabled' : 'enabled']
                ]
            };
        });

        return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Port flow diagram">${e.join('')}</svg>`;
    }

    /**
     * Wire hover highlighting + the detail popover + click-to-edit on every segment.
     * @param pop - the per-segment popover data
     * @protected
     */
    protected _bind(pop: Record<string, PopData>): void {
        const svg = this._canvas.find('svg');
        const groups = svg.find('[data-seg]');
        const canvasEl = this._canvas.get(0) as HTMLElement;

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
                const same = jQuery(node).attr('data-seg') === key;
                jQuery(node).toggleClass('ffr-hot', same);
                jQuery(node).toggleClass('ffr-dim', !same);
            });

            this._pop.html(
                `<h4><span class="ffr-dot" style="background:${data.color}"></span>${ListensPortFlow._esc(data.title)}</h4><dl>`
                + data.rows.map((r) => `<dt>${ListensPortFlow._esc(r[0])}</dt><dd>${ListensPortFlow._esc(r[1])}</dd>`).join('')
                + '</dl>'
            );

            const rect = canvasEl.getBoundingClientRect();
            let x = event.clientX - rect.left + 14;
            const y = event.clientY - rect.top + 12;
            x = Math.min(x, rect.width - 272);
            this._pop.css({left: `${Math.max(6, x)}px`, top: `${y}px`}).addClass('ffr-show');
        });

        groups.on('mouseleave', clear);
        groups.on('click', (event: JQuery.ClickEvent): void => {
            const key = jQuery(event.currentTarget).attr('data-seg') ?? '';
            const listen = this._byId.get(key);

            if (listen && this._onEdit) {
                this._onEdit(listen);
            }
        });
    }

    /**
     * The arrow-marker id for a kind.
     * @param kind - protocol kind
     * @protected
     */
    protected static _markerId(kind: string): string {
        switch (kind) {
            case 'dns': return 'm-dns';
            case 'https': return 'm-https';
            case 'http': return 'm-http';
            default: return 'm-accent';
        }
    }

    /**
     * An arrowhead marker definition.
     * @param id - marker id
     * @param fill - fill colour
     * @protected
     */
    protected static _marker(id: string, fill: string): string {
        return `<marker id="${id}" markerWidth="8.5" markerHeight="8.5" refX="6.5" refY="4.25" orient="auto"><path d="M0,0 L8.5,4.25 L0,8.5 z" fill="${fill}"/></marker>`;
    }

    /**
     * A nested container frame with a corner label.
     * @param x - x
     * @param y - y
     * @param w - width
     * @param h - height
     * @param color - stroke/label colour token
     * @param label - the frame label
     * @param anchor - label anchor (start | end)
     * @protected
     */
    protected static _frame(x: number, y: number, w: number, h: number, color: string, label: string, anchor: string): string {
        const lx = anchor === 'end' ? x + w - 14 : x + 16;
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="color-mix(in srgb, ${color} 8%, transparent)" stroke="${color}" stroke-width="1.4"/>`
            + `<text class="pf-cont-lbl" x="${lx}" y="${y + 18}" text-anchor="${anchor}" style="fill:${color}">${ListensPortFlow._esc(label)}</text>`;
    }

    /**
     * A plain node rectangle.
     * @param x - x
     * @param y - y
     * @param w - width
     * @param h - height
     * @param stroke - stroke colour
     * @param fill - fill colour
     * @param dim - render dimmed (disabled listen)
     * @protected
     */
    protected static _box(x: number, y: number, w: number, h: number, stroke: string, fill: string, dim: boolean = false): string {
        return `<rect class="pf-node" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}"${dim ? ' opacity="0.5"' : ''}/>`;
    }

    /**
     * A pipeline step box (accent-tinted) with a title + sub-caption.
     * @param x - x
     * @param y - y
     * @param w - width
     * @param h - height
     * @param title - the step title
     * @param sub - the sub-caption
     * @protected
     */
    protected static _step(x: number, y: number, w: number, h: number, title: string, sub: string): string {
        const cx = x + (w / 2);
        return `<rect class="pf-node" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="color-mix(in srgb, var(--accent) 12%, var(--surface))" stroke="var(--accent)"/>`
            + `<text class="pf-step" x="${cx}" y="${y + 19}" text-anchor="middle">${ListensPortFlow._esc(title)}</text>`
            + `<text class="pf-step-sub" x="${cx}" y="${y + 33}" text-anchor="middle">${ListensPortFlow._esc(sub)}</text>`;
    }

}
