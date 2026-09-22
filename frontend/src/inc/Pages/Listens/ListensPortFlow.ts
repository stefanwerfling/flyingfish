import {ListenTypes} from '../../Api/Listen.js';
import './portflow.css';

/**
 * The minimal listen shape the diagram needs (a subset of the Listen API entry).
 */
export type PortFlowListen = {
    id: number;
    port: number;
    type: number;
    name: string;
    check_address?: boolean;
    disable?: boolean;
};

/**
 * ListensPortFlow — the Listens page's top graphic: a data-driven port-flow diagram in the
 * FlyingFish `.ffr` design language (see portflow.css). External stream listeners enter on
 * the left, run down nginx's visible L4 stream stage (ssl_preread → IP access → domain
 * split), and route out to the internal L7 servers / DNS server and on to the backends.
 * Ingress ports are the node's real stream listens, so adding a stream listen adds an entry.
 */
export class ListensPortFlow {

    protected readonly _mount: JQuery;

    /**
     * @param parent - the element to render the diagram into
     */
    public constructor(parent: JQuery) {
        this._mount = jQuery('<div class="ffr-portflow"></div>').appendTo(parent);
    }

    /**
     * Render the diagram from the current listen list.
     * @param listens - the node's listens
     */
    public setData(listens: PortFlowListen[]): void {
        const order = (l: PortFlowListen): number => ({dns: 0, http: 1, https: 2, other: 3})[ListensPortFlow._kind(l)];
        const streams = listens.filter((l) => l.type === ListenTypes.stream).sort((a, b) => order(a) - order(b));
        const https = listens.filter((l) => l.type === ListenTypes.http).sort((a, b) => order(a) - order(b));
        const anyAccess = streams.some((l) => l.check_address === true);

        this._mount.empty();
        const panel = jQuery('<div class="pf-panel"></div>').appendTo(this._mount);

        const head = jQuery('<div class="pf-head"></div>').appendTo(panel);
        jQuery('<div><div class="pf-eyebrow">Port flow</div><div class="pf-title">How these listeners route through FlyingFish</div></div>').appendTo(head);
        jQuery('<div class="pf-legend">'
            + '<span><i style="background:var(--dns)"></i>DNS</span>'
            + '<span><i style="background:var(--http)"></i>HTTP</span>'
            + '<span><i style="background:var(--https)"></i>HTTPS</span>'
            + '<span><i style="background:var(--proxy)"></i>to backend</span>'
            + '</div>').appendTo(head);

        const canvas = jQuery('<div class="pf-canvas"></div>').appendTo(panel);

        if (streams.length === 0) {
            jQuery('<div class="pf-empty">No stream listeners yet — add one to see the flow.</div>').appendTo(canvas);
            return;
        }

        canvas.append(ListensPortFlow._buildSvg(streams, https, anyAccess));
    }

    /**
     * Classify a listen by protocol for colouring (heuristic on port/name).
     * @param l - the listen
     * @returns one of dns | https | http | other
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
        return jQuery('<div></div>').text(v).html();
    }

    /**
     * Build the SVG markup for the diagram.
     * @param streams - external stream listens (ingress)
     * @param https - internal http listens (L7 servers)
     * @param anyAccess - whether any stream enables the IP access check
     * @protected
     */
    protected static _buildSvg(streams: PortFlowListen[], https: PortFlowListen[], anyAccess: boolean): string {
        const W = 1040;
        const rowH = 118;
        const dnsStreams = streams.filter((s) => ListensPortFlow._kind(s) === 'dns');
        const hasDns = dnsStreams.length > 0;
        const destCount = https.length + (hasDns ? 1 : 0);
        const nRows = Math.max(streams.length, destCount, 3);
        const topPad = 112; // headroom for the four nested container labels
        const H = topPad + (nRows * rowH) + 20;
        const centerY = topPad + ((nRows * rowH) / 2);

        // geometry
        const portX = 160; const portW = 108; const portH = 44;
        const pipeX = 356; const pipeW = 132; const pipeH = 44;
        const destX = 512; const destW = 126; const destH = 46;
        const backX = 882; const backW = 120; const backH = 50;
        const pipeCx = pipeX + (pipeW / 2);
        const sslCy = centerY - 68; const ipCy = centerY; const domCy = centerY + 68;

        const e: string[] = [];

        // markers
        e.push('<defs>'
            + ListensPortFlow._marker('m-dns', 'var(--dns)')
            + ListensPortFlow._marker('m-http', 'var(--http)')
            + ListensPortFlow._marker('m-https', 'var(--https)')
            + ListensPortFlow._marker('m-proxy', 'var(--proxy)')
            + ListensPortFlow._marker('m-accent', 'var(--accent)')
            + '</defs>');

        // nested containers — staggered tops (for labels), shared bottom so inner frames
        // stay tall enough to hold the pipeline.
        const cBot = H - 14;
        e.push(ListensPortFlow._frame(12, 20, W - 24, cBot - 20, 'var(--c-your)', 'Your network', 'end'));
        e.push(ListensPortFlow._frame(150, 42, 512, cBot - 42, 'var(--c-docker)', 'Docker · network', 'start'));
        e.push(ListensPortFlow._frame(298, 64, 352, cBot - 64, 'var(--c-ff)', 'Docker · FlyingFish', 'start'));
        e.push(ListensPortFlow._frame(334, 86, 168, cBot - 86, 'var(--c-nginx)', 'nginx · stream L4', 'start'));

        // ---- flows first (under nodes) ----
        const portYs = ListensPortFlow._stackYs(streams.length, centerY, rowH);
        const destYs = ListensPortFlow._stackYs(destCount, centerY, rowH);

        // internet -> ports, ports -> ssl_preread
        streams.forEach((s, i) => {
            const y = portYs[i];
            const col = ListensPortFlow._color(ListensPortFlow._kind(s));
            const mk = ListensPortFlow._markerId(ListensPortFlow._kind(s));
            e.push(`<path class="pf-flow" style="stroke:${col}" d="M118,${centerY} C138,${(centerY + y) / 2}, 150,${y} 156,${y}" marker-end="url(#${mk})"/>`);
            e.push(`<path class="pf-flow" style="stroke:${col}" d="M${portX + portW},${y} C${pipeX - 40},${y} ${pipeX - 30},${sslCy} ${pipeX - 4},${sslCy}" marker-end="url(#${mk})"/>`);
        });

        // L4 down-flow (visible sequence)
        e.push(`<path class="pf-l4" d="M${pipeCx},${sslCy + (pipeH / 2)} V${ipCy - (pipeH / 2)}" marker-end="url(#m-accent)"/>`);
        e.push(`<path class="pf-l4" d="M${pipeCx},${ipCy + (pipeH / 2)} V${domCy - (pipeH / 2)}" marker-end="url(#m-accent)"/>`);

        // domain split -> destinations
        const domRight = pipeX + pipeW;
        destYs.forEach((y, i) => {
            const isDnsRow = hasDns && i === 0;
            const kind = isDnsRow ? 'dns' : ListensPortFlow._kind(https[hasDns ? i - 1 : i] ?? {port: 0, name: '', id: 0, type: 0});
            const col = ListensPortFlow._color(kind);
            const mk = ListensPortFlow._markerId(kind);
            e.push(`<path class="pf-flow" style="stroke:${col}" d="M${domRight - 4},${domCy} C${domRight + 20},${domCy} ${destX - 30},${y} ${destX - 4},${y}" marker-end="url(#${mk})"/>`);
        });

        // L7 -> backends (one backend per http server)
        https.forEach((_, i) => {
            const y = destYs[hasDns ? i + 1 : i];
            e.push(`<path class="pf-flow" style="stroke:var(--proxy)" d="M${destX + destW},${y} C${destX + destW + 60},${y} ${backX - 60},${y} ${backX - 4},${y}" marker-end="url(#m-proxy)"/>`);
        });

        // ---- nodes ----
        // internet
        e.push(ListensPortFlow._box(28, centerY - 27, 92, 54, 'var(--faint)', 'var(--surface2)'));
        e.push(`<text class="pf-node-lbl" x="74" y="${centerY - 3}" text-anchor="middle">Internet</text>`);
        e.push(`<text class="pf-node-sub" x="74" y="${centerY + 12}" text-anchor="middle">clients</text>`);

        // ingress ports
        streams.forEach((s, i) => {
            const y = portYs[i]; const kind = ListensPortFlow._kind(s); const col = ListensPortFlow._color(kind);
            e.push(ListensPortFlow._box(portX, y - (portH / 2), portW, portH, col, `color-mix(in srgb, ${col} 15%, var(--surface))`, s.disable === true));
            e.push(`<text class="pf-port" x="${portX + (portW / 2)}" y="${y - 2}" text-anchor="middle">:${s.port}</text>`);
            e.push(`<text class="pf-node-sub" x="${portX + (portW / 2)}" y="${y + 13}" text-anchor="middle">${ListensPortFlow._esc(ListensPortFlow._short(kind))}</text>`);
        });

        // L4 pipeline steps
        e.push(ListensPortFlow._step(pipeX, sslCy - (pipeH / 2), pipeW, pipeH, 'ssl_preread', 'protocol · SNI'));
        e.push(ListensPortFlow._step(pipeX, ipCy - (pipeH / 2), pipeW, pipeH, 'IP access check', anyAccess ? 'active' : 'opt-in'));
        e.push(ListensPortFlow._step(pipeX, domCy - (pipeH / 2), pipeW, pipeH, 'domain split', 'by SNI'));

        // destinations: DNS server + L7 http servers
        let di = 0;

        if (hasDns) {
            const y = destYs[di];
            e.push(ListensPortFlow._box(destX, y - (destH / 2), destW, destH, 'var(--dns)', 'var(--surface2)'));
            e.push(`<text class="pf-node-lbl" x="${destX + (destW / 2)}" y="${y - 2}" text-anchor="middle">DNS server</text>`);
            e.push(`<text class="pf-node-sub" x="${destX + (destW / 2)}" y="${y + 13}" text-anchor="middle">:53</text>`);
            di++;
        }

        https.forEach((h) => {
            const y = destYs[di]; di++;
            const kind = ListensPortFlow._kind(h);
            e.push(ListensPortFlow._box(destX, y - (destH / 2), destW, destH, 'var(--proxy)', `color-mix(in srgb, var(--proxy) 13%, var(--surface))`, h.disable === true));
            e.push(`<text class="pf-port" x="${destX + (destW / 2)}" y="${y - 2}" text-anchor="middle">:${h.port}</text>`);
            e.push(`<text class="pf-node-sub" x="${destX + (destW / 2)}" y="${y + 13}" text-anchor="middle">${kind === 'https' ? 'https · L7' : 'http · L7'}</text>`);

            // backend for this http server
            e.push(ListensPortFlow._box(backX, y - (backH / 2), backW, backH, 'var(--proxy)', 'var(--surface2)'));
            e.push(`<text class="pf-node-lbl" x="${backX + (backW / 2)}" y="${y - 2}" text-anchor="middle">${kind === 'https' ? 'HTTPS' : 'HTTP'}</text>`);
            e.push(`<text class="pf-node-sub" x="${backX + (backW / 2)}" y="${y + 13}" text-anchor="middle">backend</text>`);
        });

        return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Port flow diagram">${e.join('')}</svg>`;
    }

    /**
     * A short caption for a port node.
     * @param kind - protocol kind
     * @protected
     */
    protected static _short(kind: string): string {
        return `${kind} · stream`;
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
