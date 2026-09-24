import {ContentCol, ContentColSize} from 'bambooo';
import {ClusterNode, ClusterNodeGroup, ClusterNodeGroupMember} from 'flyingfish_schemas';
import {Registry as RegistryAPI} from '../Api/Registry.js';
import {UtilColor} from '../Utils/UtilColor.js';
import {BasePage} from './BasePage.js';
import '../Components/tree-shell.css';

/**
 * The datacenter (cluster) sections. Everything here is cluster-wide control plane —
 * the node's own nginx/DNS/host configuration lives on the node, not here.
 */
export type ClusterSection = 'overview' | 'nodes' | 'groups' | 'enrollment' | 'topology';

/**
 * ClusterView — a single datacenter section rendered in the app's tree/tabs shell.
 * One page instance per section (the section key is the page name, so the active tab
 * highlights). Only cluster-wide concerns live here (nodes, groups, enrollment,
 * topology); the trust anchor (PKI) and access control (Users & RBAC) are their own
 * datacenter tabs. Nodes/groups are projections of the converged gossip aggregate;
 * enrollment/topology are still placeholders (9.5.12).
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
                await this._nodes(page);
                break;

            case 'groups':
                await this._groups(page);
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
     * The node roster — a projection of the converged gossip roster
     * (`GET /json/registry/cluster/nodes`), the same source {@link NodeCluster} uses for
     * this node's own peer list. Empty when not clustered yet / before the first gossip.
     * @param mount - page mount
     * @protected
     */
    protected async _nodes(mount: JQuery): Promise<void> {
        jQuery('<div class="ffx-sectitle">Nodes</div>').appendTo(mount);
        jQuery('<div class="ffx-secnote">Members of this cluster. Select a node in the tree to configure it.</div>').appendTo(mount);

        let list: ClusterNode[] = [];
        let selfNodeUid: string | null = null;

        try {
            const response = await RegistryAPI.getClusterNodes();
            list = response.list;
            selfNodeUid = response.selfNodeUid;
        } catch (e) {
            // roster unavailable (not clustered / mesh off / endpoint absent)
        }

        if (list.length === 0) {
            ClusterView._empty(mount, 'Only this node so far. Add a node from the Enrollment tab to grow the cluster.');

            return;
        }

        const cards = jQuery('<div class="ffx-cards3"></div>').appendTo(mount);

        for (const node of list) {
            const isSelf = node.nodeUid === selfNodeUid;

            ClusterView._card(cards, `🖥️ ${node.host || node.commonName || node.nodeUid}`, [
                ['State', node.online ? 'online' : 'offline'],
                ['Endpoint', `${node.host || '—'}:${node.port}`],
                ['Transport', node.transport ?? '—'],
                ['This node', isSelf ? 'yes' : 'no']
            ]);
        }
    }

    /**
     * Node groups (9.5.12.3): zones/pools of nodes, shared cluster-wide via the gossip.
     * Create/edit/delete a group and toggle node membership. Read side is the aggregated
     * gossip view; writes land on whichever node the admin is on and converge everywhere.
     * @param mount - page mount
     * @protected
     */
    protected async _groups(mount: JQuery): Promise<void> {
        jQuery('<div class="ffx-sectitle">Groups</div>').appendTo(mount);
        jQuery('<div class="ffx-secnote">Group nodes into zones or pools (e.g. by site or role). A group created here converges to every node in the cluster.</div>').appendTo(mount);

        const formErr = jQuery('<div class="ffx-secnote" style="color:#c0392b"></div>');
        const body = jQuery('<div></div>');

        this._groupForm(mount, formErr, async(): Promise<void> => this._groupsBody(body));
        formErr.appendTo(mount);
        body.appendTo(mount);

        await this._groupsBody(body);
    }

    /**
     * The "new group" form (name/description/color). Calls `onSaved` after a successful
     * create so the list below refreshes without a full page reload.
     * @param mount - page mount
     * @param errOut - element to show a save error in
     * @param onSaved - called after a successful create
     * @protected
     */
    protected _groupForm(mount: JQuery, errOut: JQuery, onSaved: () => Promise<void>): void {
        const card = jQuery('<div class="ffx-card" style="max-width:640px;margin-bottom:16px"></div>').appendTo(mount);
        const bd = jQuery('<div class="bd" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"></div>').appendTo(card);

        const nameInput = jQuery('<input type="text" placeholder="Name" style="flex:1;min-width:160px;padding:7px 10px;border-radius:6px;border:1px solid rgba(127,127,127,.35);background:rgba(127,127,127,.08)">').appendTo(bd);
        const descInput = jQuery('<input type="text" placeholder="Description (optional)" style="flex:2;min-width:200px;padding:7px 10px;border-radius:6px;border:1px solid rgba(127,127,127,.35);background:rgba(127,127,127,.08)">').appendTo(bd);
        const colorInput = jQuery('<input type="color" style="width:38px;height:32px;padding:0;border:0;background:none;cursor:pointer">').appendTo(bd);
        const addBtn = jQuery('<button style="padding:7px 14px;border:0;border-radius:6px;background:#0f8a8a;color:#fff;cursor:pointer;font-weight:600">Create group</button>').appendTo(bd);

        colorInput.val(UtilColor.getColor(`group-${Date.now()}`));

        addBtn.on('click', async(): Promise<void> => {
            const name = String(nameInput.val() ?? '').trim();

            if (name === '') {
                errOut.text('Name is required.');

                return;
            }

            errOut.text('');
            addBtn.prop('disabled', true);

            try {
                await RegistryAPI.saveClusterNodeGroup({
                    name,
                    description: String(descInput.val() ?? ''),
                    color: String(colorInput.val() ?? '')
                });
                nameInput.val('');
                descInput.val('');
                await onSaved();
            } catch (e) {
                errOut.text('Could not create the group — needs the cluster.manage permission.');
            }

            addBtn.prop('disabled', false);
        });
    }

    /**
     * Fetch + render the group list (cleared and rebuilt into `body` on every call, so
     * mutations can refresh in place without re-running {@link loadContent}).
     * @param body - the list container
     * @protected
     */
    protected async _groupsBody(body: JQuery): Promise<void> {
        body.empty();

        let groups: ClusterNodeGroup[] = [];
        let members: ClusterNodeGroupMember[] = [];
        let nodes: ClusterNode[] = [];

        try {
            const [groupsResponse, nodesResponse] = await Promise.all([
                RegistryAPI.getClusterNodeGroups(),
                RegistryAPI.getClusterNodes()
            ]);
            groups = groupsResponse.groups;
            members = groupsResponse.members;
            nodes = nodesResponse.list;
        } catch (e) {
            ClusterView._empty(body, 'Could not load node groups.');

            return;
        }

        if (groups.length === 0) {
            ClusterView._empty(body, 'No node groups yet — create one above.');

            return;
        }

        const list = jQuery('<div style="display:flex;flex-direction:column;gap:12px"></div>').appendTo(body);

        for (const group of groups) {
            const groupMembers = new Set(members.filter((m) => m.groupUuid === group.id).map((m) => m.nodeUid));
            this._groupCard(list, group, groupMembers, nodes, async(): Promise<void> => this._groupsBody(body));
        }
    }

    /**
     * One group's card: header (color dot, name, description, member count, edit, delete)
     * and a membership checklist against every known node. The header/body toggle between
     * a view render and an in-place edit-form render (name/description/color); both are
     * re-invoked locally, no full-list refresh needed to flip between the two.
     * @param mount - list container
     * @param group - the group
     * @param memberUids - node uids currently in this group
     * @param nodes - every node in the roster (candidates for membership)
     * @param onChange - called after a successful save/delete/membership toggle
     * @protected
     */
    protected _groupCard(mount: JQuery, group: ClusterNodeGroup, memberUids: Set<string>, nodes: ClusterNode[], onChange: () => Promise<void>): void {
        const card = jQuery('<div class="ffx-card"></div>').appendTo(mount);
        const hd = jQuery('<div class="hd"></div>').appendTo(card);
        const bd = jQuery('<div class="bd"></div>').appendTo(card);

        const renderView = (): void => {
            hd.empty();
            bd.empty();

            const color = group.color !== '' ? group.color : UtilColor.getColor(group.id);

            jQuery(`<span style="width:11px;height:11px;border-radius:50%;background:${ClusterView._esc(color)};display:inline-block"></span>`).appendTo(hd);
            jQuery(`<span class="t">${ClusterView._esc(group.name)}</span>`).appendTo(hd);
            jQuery(`<span style="color:var(--faint);font-size:12px;margin-left:6px">${memberUids.size} node${memberUids.size === 1 ? '' : 's'}</span>`).appendTo(hd);

            const editBtn = jQuery('<button style="margin-left:auto;padding:4px 10px;border:0;border-radius:6px;background:rgba(127,127,127,.14);color:var(--soft);cursor:pointer;font-size:12px">Edit</button>').appendTo(hd);
            const delBtn = jQuery('<button style="padding:4px 10px;border:0;border-radius:6px;background:rgba(192,57,43,.14);color:#c0392b;cursor:pointer;font-size:12px">Delete</button>').appendTo(hd);

            editBtn.on('click', (): void => renderEdit());

            delBtn.on('click', async(): Promise<void> => {
                if (!window.confirm(`Delete the group "${group.name}"? This removes all its memberships.`)) {
                    return;
                }

                delBtn.prop('disabled', true);

                try {
                    await RegistryAPI.deleteClusterNodeGroup({id: group.id});
                    await onChange();
                } catch (e) {
                    delBtn.prop('disabled', false);
                }
            });

            if (group.description !== '') {
                jQuery(`<div style="color:var(--soft);font-size:12.5px;margin-bottom:10px">${ClusterView._esc(group.description)}</div>`).appendTo(bd);
            }

            if (nodes.length === 0) {
                ClusterView._empty(bd, 'No nodes in the roster to assign yet.');

                return;
            }

            const list = jQuery('<div style="display:flex;flex-direction:column;gap:4px"></div>').appendTo(bd);

            for (const node of nodes) {
                const label = jQuery('<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;cursor:pointer"></label>').appendTo(list);
                const checkbox = jQuery('<input type="checkbox">').appendTo(label);

                checkbox.prop('checked', memberUids.has(node.nodeUid));
                jQuery(`<span>${ClusterView._esc(node.host || node.commonName || node.nodeUid)}</span>`).appendTo(label);

                checkbox.on('change', async(): Promise<void> => {
                    const member = checkbox.prop('checked');

                    checkbox.prop('disabled', true);

                    try {
                        await RegistryAPI.setClusterNodeGroupMembership({nodeUid: node.nodeUid, groupUuid: group.id, member});
                        await onChange();
                    } catch (e) {
                        checkbox.prop('checked', !member);
                        checkbox.prop('disabled', false);
                    }
                });
            }
        };

        const renderEdit = (): void => {
            hd.empty();
            bd.empty();

            jQuery('<span class="t">Edit group</span>').appendTo(hd);

            const form = jQuery('<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"></div>').appendTo(bd);
            const nameInput = jQuery('<input type="text" placeholder="Name" style="flex:1;min-width:160px;padding:7px 10px;border-radius:6px;border:1px solid rgba(127,127,127,.35);background:rgba(127,127,127,.08)">').appendTo(form);
            const descInput = jQuery('<input type="text" placeholder="Description (optional)" style="flex:2;min-width:200px;padding:7px 10px;border-radius:6px;border:1px solid rgba(127,127,127,.35);background:rgba(127,127,127,.08)">').appendTo(form);
            const colorInput = jQuery('<input type="color" style="width:38px;height:32px;padding:0;border:0;background:none;cursor:pointer">').appendTo(form);
            const saveBtn = jQuery('<button style="padding:7px 14px;border:0;border-radius:6px;background:#0f8a8a;color:#fff;cursor:pointer;font-weight:600">Save</button>').appendTo(form);
            const cancelBtn = jQuery('<button style="padding:7px 14px;border:0;border-radius:6px;background:rgba(127,127,127,.14);color:var(--soft);cursor:pointer">Cancel</button>').appendTo(form);
            const err = jQuery('<div class="ffx-secnote" style="color:#c0392b;width:100%;margin:6px 0 0"></div>').appendTo(bd);

            nameInput.val(group.name);
            descInput.val(group.description);
            colorInput.val(group.color !== '' ? group.color : UtilColor.getColor(group.id));

            cancelBtn.on('click', (): void => renderView());

            saveBtn.on('click', async(): Promise<void> => {
                const name = String(nameInput.val() ?? '').trim();

                if (name === '') {
                    err.text('Name is required.');

                    return;
                }

                err.text('');
                saveBtn.prop('disabled', true);

                try {
                    await RegistryAPI.saveClusterNodeGroup({
                        id: group.id,
                        name,
                        description: String(descInput.val() ?? ''),
                        color: String(colorInput.val() ?? '')
                    });
                    await onChange();
                } catch (e) {
                    err.text('Could not save the group — needs the cluster.manage permission.');
                    saveBtn.prop('disabled', false);
                }
            });
        };

        renderView();
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
