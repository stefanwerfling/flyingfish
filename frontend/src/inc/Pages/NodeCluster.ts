import {ContentCol, ContentColSize} from 'bambooo';
import {ClusterJoinPackageResponse, ClusterNode} from 'flyingfish_schemas';
import {Registry as RegistryAPI} from '../Api/Registry.js';
import {FfxButton, FfxTextarea} from '../Components/FfxControls.js';
import {BasePage} from './BasePage.js';
import '../Components/tree-shell.css';

/**
 * NodeCluster — this node's cluster membership view and the guided two-node join
 * wizard (Cluster/Mesh epic 9.5.12.2, `Datacenter → Node → System → Cluster`).
 *
 * Clustering is two halves done on TWO machines, which is the thing users trip over,
 * so this page leads with an explicit role choice ("add another node to this one" vs
 * "connect this node to an existing cluster") and only then reveals the matching step.
 *
 * The join model is cross-CA mesh (model (b)): each node self-enrolls its own identity
 * against its own pkiserver at boot, and a join package (mesh endpoint + single-use
 * token + the issuer's CA fingerprint) lets the two sides mutually verify and mesh
 * DIRECTLY on token validation — there is no separate admin-approval step for the mesh
 * join (the pending/approve enrollment state machine belongs to the shared-CA EST flow,
 * which cluster join does not use). Everything read here is a projection of the
 * converged gossip roster (`GET /json/registry/cluster/nodes`); before this node is in
 * a cluster the roster is empty and a standalone state shows.
 */
export class NodeCluster extends BasePage {

    public constructor() {
        super();
        // page name / active-tab key (matches the `cluster` tree leaf)
        this._name = 'cluster';
        this.setTitle('Cluster');
    }

    /**
     * loadContent — fetch the roster and render status / role-choice wizard /
     * identity / peers.
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
            // roster unavailable (not clustered / mesh off / endpoint absent) — standalone state
        }

        const self = selfNodeUid === null ? undefined : list.find((n) => n.nodeUid === selfNodeUid);
        const peers = list.filter((n) => n.nodeUid !== selfNodeUid);
        const inCluster = selfNodeUid !== null;

        jQuery('<div class="ffx-sectitle">Cluster</div>').appendTo(page);
        jQuery('<div class="ffx-secnote">Link two FlyingFish nodes into one cluster so they share resources. Clustering is a two-step handshake done on <b>both</b> machines — this wizard walks you through it.</div>').appendTo(page);

        this._status(page, inCluster, peers.length);
        this._wizard(page);
        this._identity(page, self, selfNodeUid, inCluster);
        this._peers(page, peers, inCluster);
    }

    /**
     * A one-line banner telling the user where this node currently stands, so the
     * role choice below has context.
     * @protected
     */
    protected _status(mount: JQuery, inCluster: boolean, peerCount: number): void {
        let label = '● Standalone — this node is not connected to any other node yet.';
        let color = 'var(--warn)';

        if (inCluster && peerCount > 0) {
            label = `● In a cluster — ${peerCount} peer${peerCount === 1 ? '' : 's'} connected.`;
            color = 'var(--good)';
        } else if (inCluster) {
            label = '● In a cluster — but no peers are connected yet.';
        }

        jQuery(`<div style="margin:2px 0 18px;font-size:13px;font-weight:600;color:${color}"></div>`).text(label).appendTo(mount);
    }

    /**
     * The role-choice wizard: pick what THIS node should do, then reveal only the
     * matching step. This is the fix for the "two halves, which one do I use?"
     * confusion — the choice names the machine each half runs on.
     * @protected
     */
    protected _wizard(mount: JQuery): void {
        jQuery('<div class="ffx-sectitle" style="margin-top:6px">What do you want to do on this node?</div>').appendTo(mount);

        const grid = jQuery('<div class="sm-grid" style="margin-bottom:14px"></div>').appendTo(mount);

        // The two step panels, hidden until a role is picked.
        const invitePanel = jQuery('<div style="display:none"></div>');
        const joinPanel = jQuery('<div style="display:none"></div>');

        const inviteCard = NodeCluster._roleCard(
            grid,
            '🌱',
            'Add another node to this one',
            'Do this on the node you already use. It mints a one-time join package for you to carry to the new node.'
        );
        const joinCard = NodeCluster._roleCard(
            grid,
            '🔗',
            'Connect this node to an existing cluster',
            'Do this on the NEW node. Paste in the join package from the node that already runs the cluster.'
        );

        const select = (active: JQuery, other: JQuery, show: JQuery, hide: JQuery): void => {
            active.addClass('active');
            other.removeClass('active');
            show.show();
            hide.hide();
        };

        inviteCard.on('click', () => select(inviteCard, joinCard, invitePanel, joinPanel));
        joinCard.on('click', () => select(joinCard, inviteCard, joinPanel, invitePanel));

        invitePanel.appendTo(mount);
        joinPanel.appendTo(mount);

        this._invite(invitePanel);
        this._joinCluster(joinPanel);
    }

    /**
     * A selectable role card (reuses the System page's `sm-card` chrome).
     * @protected
     */
    protected static _roleCard(mount: JQuery, icon: string, title: string, note: string): JQuery {
        const card = jQuery('<div class="sm-card" style="cursor:pointer"></div>').appendTo(mount);
        const hd = jQuery('<div class="sm-hd"></div>').appendTo(card);
        jQuery('<div class="sm-ic"></div>').text(icon).appendTo(hd);
        jQuery('<div class="sm-t"></div>').text(title).appendTo(hd);
        jQuery('<div class="sm-note"></div>').text(note).appendTo(card);

        return card;
    }

    /**
     * Invite step — mint a join package to hand to another node.
     * @protected
     */
    protected _invite(mount: JQuery): void {
        jQuery('<div class="ffx-sectitle" style="margin-top:10px">Step 2 — generate the join package</div>').appendTo(mount);
        jQuery('<div class="ffx-secnote">This mints a single-use package (this node\'s mesh endpoint, a one-time token and its CA fingerprint). You then carry it to the new node.</div>').appendTo(mount);

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
            rows.push(['Expires', pkg.expiresAt > 0 ? new Date(pkg.expiresAt).toLocaleString() : '—']);
        }

        const cards = jQuery('<div class="ffx-cards3"></div>').appendTo(mount);
        NodeCluster._card(cards, '📦 Join package', rows);

        if (!pkg.configured) {
            NodeCluster._empty(mount, 'Token minting is not configured on this node — only the CA pin is shown, no bootstrap token, so a joining node cannot use this package yet. Set PKI_TOKEN_SECRET (same value for the backend and pkiserver, e.g. in /opt/flyingfish/.env) and restart both, then generate again.');

            return;
        }

        jQuery('<div class="ffx-secnote" style="margin-top:8px">Copy this whole block, then on the <b>new node</b> open this same Cluster page, choose <b>“Connect this node to an existing cluster”</b>, and paste it. The two nodes verify each other and mesh directly — there is no separate approval step.</div>').appendTo(mount);

        const pkgJson = JSON.stringify({
            meshHost: pkg.meshHost,
            meshPort: pkg.meshPort,
            bootstrapToken: pkg.bootstrapToken,
            caFingerprint: pkg.caFingerprint
        });

        jQuery(`<div style="margin-top:4px;padding:8px 10px;border-radius:6px;background:rgba(127,127,127,.14);font-family:monospace;font-size:12px;word-break:break-all;user-select:all">${NodeCluster._esc(pkgJson)}</div>`).appendTo(mount);
    }

    /**
     * Join step: paste a join package from another node and apply it — this node
     * seed-dials the target and runs the bootstrap so they mesh (9.5.12.2).
     * @protected
     */
    protected _joinCluster(mount: JQuery): void {
        jQuery('<div class="ffx-sectitle" style="margin-top:10px">Step 2 — paste the join package</div>').appendTo(mount);
        jQuery('<div class="ffx-secnote">Paste the package generated on the other node. This node then bootstraps a mutually-trusted mesh link to it — no approval step, they connect once the token and CA pin check out.</div>').appendTo(mount);

        const input = new FfxTextarea(3, '{"meshHost":"…","meshPort":5336,"bootstrapToken":"…","caFingerprint":"…"}');
        input.getElement().appendTo(mount);

        const btn = new FfxButton('Connect to cluster', 'primary', 'form');
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
            btn.setLabel('Connecting…');

            try {
                await RegistryAPI.applyClusterJoin({
                    meshHost: parsed.meshHost,
                    meshPort: parsed.meshPort,
                    bootstrapToken: parsed.bootstrapToken,
                    caFingerprint: parsed.caFingerprint
                });
                NodeCluster._empty(out, 'Connecting — bootstrapping the mesh link. The peer should appear under “Cluster nodes” below within a few seconds; reload this page to refresh.');
            } catch (e) {
                NodeCluster._empty(out, 'Connect failed — needs the cluster.manage permission, or the mesh is not active on this node.');
            }

            btn.setDisabled(false);
            btn.setLabel('Connect to cluster');
        });
    }

    /**
     * This node's cluster identity + transport.
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
     * The cluster peers and how each connects.
     * @protected
     */
    protected _peers(mount: JQuery, peers: ClusterNode[], inCluster: boolean): void {
        jQuery('<div class="ffx-sectitle" style="margin-top:18px">Cluster nodes</div>').appendTo(mount);

        if (!inCluster || peers.length === 0) {
            NodeCluster._empty(mount, inCluster ?
                'No other nodes yet — this is the only member. Use the wizard above to add a second node.' :
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