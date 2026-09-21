import {ContentCol, ContentColSize} from 'bambooo';
import {BasePage} from './BasePage.js';
import '../Components/tree-shell.css';

/**
 * The datacenter (cluster) sections. Everything here is cluster-wide control plane —
 * the node's own nginx/DNS/host configuration lives on the node, not here.
 */
export type ClusterSection = 'overview' | 'nodes' | 'enrollment' | 'topology';

/**
 * ClusterView — a single datacenter section rendered in the app's tree/tabs shell.
 * One page instance per section (the section key is the page name, so the active tab
 * highlights). Only cluster-wide concerns live here (nodes, enrollment, topology);
 * the trust anchor (PKI) and access control (Users & RBAC) are their own datacenter
 * tabs. Real gossip roster + cross-node data wire in with the cluster backend (9.5.12).
 */
export class ClusterView extends BasePage {

    /**
     * The section this instance shows (doubles as the page name / active-tab key).
     * @protected
     */
    protected _section: ClusterSection;

    /**
     * @param section - which datacenter section to render
     */
    public constructor(section: ClusterSection) {
        super();
        this._section = section;
        this._name = section;
        this.setTitle('Datacenter');
    }

    /**
     * loadContent — render the section into a token-scoped page wrapper.
     */
    public override async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();
        const col = new ContentCol(content, ContentColSize.col12);
        const page = jQuery('<div class="ffx-page"></div>').appendTo(jQuery(col.getElement()));

        switch (this._section) {
            case 'overview':
                this._overview(page);
                break;

            case 'nodes':
                this._nodes(page);
                break;

            case 'enrollment':
                this._enrollment(page);
                break;

            case 'topology':
                this._topology(page);
                break;

            default:
                break;
        }
    }

    /**
     * Cluster health at a glance.
     * @param mount - page mount
     * @protected
     */
    protected _overview(mount: JQuery): void {
        jQuery('<div class="ffx-sectitle">Cluster overview</div>').appendTo(mount);
        jQuery('<div class="ffx-secnote">Cluster-wide status. Per-node configuration (domains, routes, DNS, listeners, router, settings) lives on each node in the tree.</div>').appendTo(mount);

        const cards = jQuery('<div class="ffx-cards3"></div>').appendTo(mount);
        ClusterView._card(cards, '🩺 Health', [['Nodes online', '1 / 1'], ['Pending joins', '0'], ['Quorum', 'n/a (single node)']]);
        ClusterView._card(cards, '🔐 Trust anchor', [['CA', 'this node'], ['Enrolled certs', '—'], ['Model', 'single CA · per-node Hub']]);
        ClusterView._card(cards, '🕸️ Overlay', [['Transport', 'QUIC'], ['Address', '100.64.0.1 · fd00:ff::1'], ['Peers', '0']]);
    }

    /**
     * The node roster.
     * @param mount - page mount
     * @protected
     */
    protected _nodes(mount: JQuery): void {
        jQuery('<div class="ffx-sectitle">Nodes</div>').appendTo(mount);
        jQuery('<div class="ffx-secnote">Members of this cluster. Select a node in the tree to configure it.</div>').appendTo(mount);

        const cards = jQuery('<div class="ffx-cards3"></div>').appendTo(mount);
        ClusterView._card(cards, '🖥️ flyingfish-nuc', [['State', 'online'], ['Role', 'CA · Hub (anchor)'], ['Overlay', '100.64.0.1'], ['This node', 'yes']]);
        ClusterView._empty(mount, 'Only this node so far. Add a node from the Enrollment tab to grow the cluster.');
    }

    /**
     * Pending join requests.
     * @param mount - page mount
     * @protected
     */
    protected _enrollment(mount: JQuery): void {
        jQuery('<div class="ffx-sectitle">Enrollment</div>').appendTo(mount);
        jQuery('<div class="ffx-secnote">Approve a node\'s join request to issue it a cluster certificate (mTLS). The approving node acts as the CA.</div>').appendTo(mount);
        ClusterView._empty(mount, 'No pending join requests. Cross-host bootstrap-token enrollment lands with the cluster backend (9.5.12).');
    }

    /**
     * The cluster mesh.
     * @param mount - page mount
     * @protected
     */
    protected _topology(mount: JQuery): void {
        jQuery('<div class="ffx-sectitle">Topology</div>').appendTo(mount);
        jQuery('<div class="ffx-secnote">The overlay mesh: nodes and their peer links.</div>').appendTo(mount);
        ClusterView._empty(mount, 'A single node — no peer links yet. The mesh view appears once a second node joins.');
    }

    /**
     * A small key/value card.
     * @param mount - card row
     * @param title - card title
     * @param rows - [label, value] pairs
     * @protected
     */
    protected static _card(mount: JQuery, title: string, rows: [string, string][]): void {
        const card = jQuery(`<div class="ffx-card"><div class="hd"><span class="t">${ClusterView._esc(title)}</span></div></div>`).appendTo(mount);
        const bd = jQuery('<div class="bd"></div>').appendTo(card);
        const dl = jQuery('<dl class="ffx-kv"></dl>').appendTo(bd);

        for (const [k, v] of rows) {
            jQuery(`<dt>${ClusterView._esc(k)}</dt><dd>${ClusterView._esc(v)}</dd>`).appendTo(dl);
        }
    }

    /**
     * A muted empty-state line.
     * @param mount - page mount
     * @param note - the message
     * @protected
     */
    protected static _empty(mount: JQuery, note: string): void {
        jQuery(`<div class="ffx-empty">${ClusterView._esc(note)}</div>`).appendTo(mount);
    }

    /**
     * Minimal HTML escape.
     * @param value - raw text
     * @protected
     */
    protected static _esc(value: string): string {
        return jQuery('<div></div>').text(value).html();
    }

}
