import {ContentCol, ContentColSize} from 'bambooo';
import {ClusterJoinPackageResponse, ClusterNode} from 'flyingfish_schemas';
import {Registry as RegistryAPI} from '../Api/Registry.js';
import {FfxButton, FfxTextarea} from '../Components/FfxControls.js';
import {BasePage} from './BasePage.js';
import '../Components/tree-shell.css';

/**
 * NodeCluster — this node's cluster membership view (Cluster/Mesh epic 9.5.12.2,
 * `Datacenter → Node → System → Cluster`). Node-local: shows THIS node's cluster
 * identity + transport, its peers with their connection state, and (later) the
 * join flow. The cluster-wide roster/enrollment approval lives at the Datacenter.
 * Read-only for now — the interactive join/token-mint write path lands next
 * (bootstrap-token minting is socket-only today). Everything here is a projection
 * of the converged gossip roster (`GET /json/registry/cluster/nodes`); when this
 * node is not in a cluster yet the roster is empty and an isolated-node state shows.
 */
export class NodeCluster extends BasePage {

    public constructor() {
        super();
        // page name / active-tab key (matches the `cluster` tree leaf)
        this._name = 'cluster';
        this.setTitle('Cluster');
    }

    /**
     * loadContent — fetch the roster and render identity / peers / join.
     */
    public override async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();
        const col = new ContentCol(content, ContentColSize.col12);
        const page = jQuery('<div class="ffx-page"></div>').appendTo(jQuery(col.getElement()));

        let list: ClusterNode[] = [];
        let selfNodeUid: string | null = null;

        try {
            const response = await RegistryAPI.getClusterNodes();
            list = response.list;
            selfNodeUid = response.selfNodeUid;
        } catch (e) {
            // roster unavailable (not clustered / mesh off / endpoint absent) — isolated state
        }

        const self = selfNodeUid === null ? undefined : list.find((n) => n.nodeUid === selfNodeUid);
        const peers = list.filter((n) => n.nodeUid !== selfNodeUid);
        const inCluster = selfNodeUid !== null;

        jQuery('<div class="ffx-sectitle">Cluster</div>').appendTo(page);
        jQuery('<div class="ffx-secnote">This node\'s cluster membership, identity and peers. Approving other nodes\' join requests lives in the Datacenter → Enrollment tab.</div>').appendTo(page);

        this._identity(page, self, selfNodeUid, inCluster);
        this._join(page);
        this._joinCluster(page);
        this._peers(page, peers, inCluster);
    }

    /**
     * Block 1 — this node's cluster identity + transport.
     * @protected
     */
    protected _identity(mount: JQuery, self: ClusterNode | undefined, selfNodeUid: string | null, inCluster: boolean): void {
        jQuery('<div class="ffx-sectitle" style="margin-top:18px">This node</div>').appendTo(mount);

        let enrolled = '—';

        if (self !== undefined) {
            enrolled = self.enrolled ? 'yes (cluster CA cert)' : 'no';
        }

        let state = '—';

        if (self !== undefined) {
            state = self.online ? 'online' : 'offline';
        }

        const cards = jQuery('<div class="ffx-cards3"></div>').appendTo(mount);
        NodeCluster._card(cards, '🪪 Identity', [
            ['Membership', inCluster ? 'in cluster' : 'standalone (no mesh peer)'],
            ['Node uid', selfNodeUid ?? '—'],
            ['Common name', self?.commonName ?? '—'],
            ['Enrolled', enrolled]
        ]);
        NodeCluster._card(cards, '🕸️ Transport', [
            ['Peer transport', self?.transport ?? '—'],
            ['Advertise', self ? `${self.host}:${self.port}` : '—'],
            ['State', state]
        ]);
        NodeCluster._card(cards, '🔑 Certificate', [
            ['Fingerprint (SHA-256)', self?.certFingerprint ? NodeCluster._shortFp(self.certFingerprint) : '—']
        ]);
    }

    /**
     * Block 2 — invite a node: mint a join package to hand to another node.
     * @protected
     */
    protected _join(mount: JQuery): void {
        jQuery('<div class="ffx-sectitle" style="margin-top:18px">Invite a node (join package)</div>').appendTo(mount);
        jQuery('<div class="ffx-secnote">Generate a single-use join package to hand to another node so it can enroll into this cluster. The joining node\'s request then lands in Datacenter → Enrollment for approval.</div>').appendTo(mount);

        const btn = new FfxButton('Generate join package', 'primary', 'form');
        btn.getElement().css('margin', '4px 0 2px').appendTo(mount);
        const out = jQuery('<div style="margin-top:12px"></div>').appendTo(mount);

        btn.onClick(async(): Promise<void> => {
            btn.setDisabled(true);
            btn.setLabel('Generating…');
            out.empty();

            try {
                const pkg = await RegistryAPI.generateJoinPackage();
                NodeCluster._renderPackage(out, pkg);
            } catch (e) {
                NodeCluster._empty(out, 'Could not generate a join package — needs the cluster.manage permission.');
            }

            btn.setDisabled(false);
            btn.setLabel('Generate join package');
        });
    }

    /**
     * Render a minted join package (or the token-less fallback).
     * @protected
     */
    protected static _renderPackage(mount: JQuery, pkg: ClusterJoinPackageResponse): void {
        const rows: [string, string][] = [
            ['pkiserver URL', pkg.pkiUrl || '—'],
            ['CA fingerprint', pkg.caFingerprint ? NodeCluster._shortFp(pkg.caFingerprint) : '—'],
            ['Mesh endpoint', pkg.meshHost ? `${pkg.meshHost}:${pkg.meshPort}` : '— (this node is not meshed)']
        ];

        if (pkg.configured) {
            rows.push(['Approval', pkg.autoApprove ? 'auto-approve' : 'queued (admin approves)']);
            rows.push(['Expires', pkg.expiresAt > 0 ? new Date(pkg.expiresAt).toLocaleString() : '—']);
        }

        const cards = jQuery('<div class="ffx-cards3"></div>').appendTo(mount);
        NodeCluster._card(cards, '📦 Join package', rows);

        if (!pkg.configured) {
            NodeCluster._empty(mount, 'Token minting is not configured on this node — only the CA pin is shown, no bootstrap token, so a joining node cannot use this package yet. Set PKI_TOKEN_SECRET (same value for the backend and pkiserver, e.g. in /opt/flyingfish/.env) and restart both, then generate again.');

            return;
        }

        jQuery('<div class="ffx-secnote" style="margin-top:8px">Join package (single-use) — copy the whole block into the joining node\'s "Join a cluster" field:</div>').appendTo(mount);

        const pkgJson = JSON.stringify({
            meshHost: pkg.meshHost,
            meshPort: pkg.meshPort,
            bootstrapToken: pkg.bootstrapToken,
            caFingerprint: pkg.caFingerprint
        });

        jQuery(`<div style="margin-top:4px;padding:8px 10px;border-radius:6px;background:rgba(127,127,127,.14);font-family:monospace;font-size:12px;word-break:break-all;user-select:all">${NodeCluster._esc(pkgJson)}</div>`).appendTo(mount);
    }

    /**
     * "Join a cluster": paste a join package from another node and apply it — this
     * node seed-dials the target and runs the bootstrap so they mesh (9.5.12.2).
     * @protected
     */
    protected _joinCluster(mount: JQuery): void {
        jQuery('<div class="ffx-sectitle" style="margin-top:18px">Join a cluster</div>').appendTo(mount);
        jQuery('<div class="ffx-secnote">Paste a join package generated by another node (its mesh endpoint, a single-use token and its CA pin). This node then bootstraps a mutually-trusted mesh link to it.</div>').appendTo(mount);

        const input = new FfxTextarea(3, '{"meshHost":"…","meshPort":5336,"bootstrapToken":"…","caFingerprint":"…"}');
        input.getElement().appendTo(mount);

        const btn = new FfxButton('Apply join package', 'primary', 'form');
        btn.getElement().css('margin-top', '6px').appendTo(mount);
        const out = jQuery('<div style="margin-top:8px"></div>').appendTo(mount);

        btn.onClick(async(): Promise<void> => {
            out.empty();

            let parsed: {meshHost?: unknown; meshPort?: unknown; bootstrapToken?: unknown; caFingerprint?: unknown;};

            try {
                parsed = JSON.parse(input.getValue());
            } catch (e) {
                NodeCluster._empty(out, 'That is not a valid join package (JSON parse failed).');

                return;
            }

            if (typeof parsed.meshHost !== 'string' || typeof parsed.meshPort !== 'number' ||
                typeof parsed.bootstrapToken !== 'string' || typeof parsed.caFingerprint !== 'string') {
                NodeCluster._empty(out, 'The join package is missing fields (meshHost, meshPort, bootstrapToken, caFingerprint).');

                return;
            }

            btn.setDisabled(true);
            btn.setLabel('Joining…');

            try {
                await RegistryAPI.applyClusterJoin({
                    meshHost: parsed.meshHost,
                    meshPort: parsed.meshPort,
                    bootstrapToken: parsed.bootstrapToken,
                    caFingerprint: parsed.caFingerprint
                });
                NodeCluster._empty(out, 'Join started — bootstrapping the mesh link. The peer should appear under Cluster nodes shortly (and needs approval on the other side).');
            } catch (e) {
                NodeCluster._empty(out, 'Join failed — needs the cluster.manage permission, or the mesh is not active on this node.');
            }

            btn.setDisabled(false);
            btn.setLabel('Apply join package');
        });
    }

    /**
     * Block 3 — the cluster peers and how each connects.
     * @protected
     */
    protected _peers(mount: JQuery, peers: ClusterNode[], inCluster: boolean): void {
        jQuery('<div class="ffx-sectitle" style="margin-top:18px">Cluster nodes</div>').appendTo(mount);

        if (!inCluster || peers.length === 0) {
            NodeCluster._empty(mount, inCluster ?
                'No other nodes yet — this is the only member. Join a second node to grow the cluster.' :
                'Not part of a cluster, so no peers.');

            return;
        }

        const cards = jQuery('<div class="ffx-cards3"></div>').appendTo(mount);

        for (const peer of peers) {
            NodeCluster._card(cards, `🖥️ ${peer.commonName || peer.host || peer.nodeUid}`, [
                ['State', peer.online ? 'online' : 'offline'],
                ['Endpoint', `${peer.host || '—'}:${peer.port}`],
                ['Transport', peer.transport ?? '—'],
                // connection direction / relay / latency is not captured yet (9.5.5–9.5.8)
                ['Connection', peer.online ? 'direct (details pending)' : 'unreachable'],
                ['Node uid', peer.nodeUid]
            ]);
        }
    }

    /**
     * Shorten a colon-separated fingerprint for display (first/last groups).
     * @protected
     */
    protected static _shortFp(fp: string): string {
        const parts = fp.split(':');

        if (parts.length <= 8) {
            return fp;
        }

        return `${parts.slice(0, 4).join(':')} … ${parts.slice(-4).join(':')}`;
    }

    /**
     * A small key/value card (mirrors the datacenter section cards).
     * @protected
     */
    protected static _card(mount: JQuery, title: string, rows: [string, string][]): void {
        const card = jQuery(`<div class="ffx-card"><div class="hd"><span class="t">${NodeCluster._esc(title)}</span></div></div>`).appendTo(mount);
        const bd = jQuery('<div class="bd"></div>').appendTo(card);
        const dl = jQuery('<dl class="ffx-kv"></dl>').appendTo(bd);

        for (const [k, v] of rows) {
            jQuery(`<dt>${NodeCluster._esc(k)}</dt><dd>${NodeCluster._esc(v)}</dd>`).appendTo(dl);
        }
    }

    /**
     * A muted empty-state line.
     * @protected
     */
    protected static _empty(mount: JQuery, note: string): void {
        jQuery(`<div class="ffx-empty">${NodeCluster._esc(note)}</div>`).appendTo(mount);
    }

    /**
     * Minimal HTML escape.
     * @protected
     */
    protected static _esc(value: string): string {
        return jQuery('<div></div>').text(value).html();
    }

}