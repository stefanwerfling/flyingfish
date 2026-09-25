import {ContentCol, ContentColSize} from 'bambooo';
import {ClusterEffectiveAccessEntry, ClusterNode, ClusterNodeGroup, ClusterNodeGroupMember, ClusterNodeGroupShare, StatusCodes} from 'flyingfish_schemas';
import {Registry as RegistryAPI} from '../Api/Registry.js';
import {UtilColor} from '../Utils/UtilColor.js';
import {FfxButton, FfxCheckboxRow, FfxColorInput, FfxInput, FfxSelect} from '../Components/FfxControls.js';
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

        const peers = list.filter((node) => node.nodeUid !== selfNodeUid);

        if (peers.length > 0) {
            this._remoteDomains(mount, peers);
        }
    }

    /**
     * Browse a peer node's domains (Cluster/Mesh epic 9.5.12.6 — the first cross-node
     * resource op). Gated end-to-end by node-group sharing + an RBAC grant scoped to
     * that group (see `canAccessRemoteResource`); a denial or a mesh-level failure both
     * show as a message here rather than a thrown error — this panel is exploratory, not
     * a place to build resource management UI onto yet.
     * @param mount - page mount
     * @param peers - the non-self nodes in the roster (candidates to browse)
     * @protected
     */
    protected _remoteDomains(mount: JQuery, peers: ClusterNode[]): void {
        jQuery('<div class="ffx-sectitle" style="margin-top:20px">Browse a node\'s domains</div>').appendTo(mount);
        jQuery('<div class="ffx-secnote">Reads a peer\'s domains over the mesh — only works if that node shares `domain` with a group you hold a matching RBAC grant on (Groups tab).</div>').appendTo(mount);

        const form = jQuery('<div style="display:flex;gap:8px;align-items:center"></div>').appendTo(mount);

        const nodeSelect = new FfxSelect('field', peers.map((peer) => ({
            key: peer.nodeUid,
            label: peer.host || peer.commonName || peer.nodeUid
        })));
        nodeSelect.getElement().appendTo(form);

        const loadBtn = new FfxButton('Load domains', 'primary', 'field');
        loadBtn.getElement().appendTo(form);
        const result = jQuery('<div style="margin-top:10px"></div>').appendTo(mount);

        loadBtn.onClick(async(): Promise<void> => {
            result.empty();
            loadBtn.setDisabled(true);

            try {
                const response = await RegistryAPI.getClusterRemoteDomains(nodeSelect.getValue());

                if (response.statusCode === StatusCodes.UNAUTHORIZED) {
                    ClusterView._empty(result, 'Not authorized — that node does not share domains with a group you hold a matching RBAC grant on.');
                } else if (response.statusCode !== StatusCodes.OK) {
                    ClusterView._empty(result, 'Could not read that node\'s domains (mesh unreachable, or it declined).');
                } else if (response.list.length === 0) {
                    ClusterView._empty(result, 'Authorized, but that node has no domains.');
                } else {
                    const list = jQuery('<div style="display:flex;flex-direction:column;gap:3px"></div>').appendTo(result);

                    for (const domain of response.list) {
                        jQuery(`<div style="font-size:12.5px;font-family:var(--mono, monospace)">${ClusterView._esc(domain.name)}${domain.disable ? ' <span style="color:var(--faint)">(disabled)</span>' : ''}</div>`).appendTo(list);
                    }
                }
            } catch (e) {
                ClusterView._empty(result, 'Could not read that node\'s domains.');
            }

            loadBtn.setDisabled(false);
        });
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

        const accessMount = jQuery('<div style="margin-top:22px"></div>').appendTo(mount);
        await this._effectiveAccess(accessMount);
    }

    /**
     * Effective-access preview (Cluster/Mesh epic 9.5.12.5): every node-group sharing rule
     * joined with the RBAC roles granted on that same group, resolved to permission keys —
     * "what does sharing + RBAC actually combine to grant, right now". A share with no
     * matching role grant is invisible here (default-deny still holds). Grants themselves
     * are managed on the Users & RBAC tab, not here — this is read-only.
     * @param mount - page mount
     * @protected
     */
    protected async _effectiveAccess(mount: JQuery): Promise<void> {
        jQuery('<div class="ffx-sectitle">Effective access</div>').appendTo(mount);
        jQuery('<div class="ffx-secnote">What sharing + RBAC actually combine to grant, right now. Grant a role on a node group under Users &amp; RBAC to make a share here take effect.</div>').appendTo(mount);

        let entries: ClusterEffectiveAccessEntry[] = [];
        let nodes: ClusterNode[] = [];

        try {
            const [accessResponse, nodesResponse] = await Promise.all([
                RegistryAPI.getClusterEffectiveAccess(),
                RegistryAPI.getClusterNodes()
            ]);
            entries = accessResponse.entries;
            nodes = nodesResponse.list;
        } catch (e) {
            ClusterView._empty(mount, 'Could not load the effective-access preview.');

            return;
        }

        if (entries.length === 0) {
            ClusterView._empty(mount, 'Nothing is effectively granted yet — a share needs a matching RBAC role grant on the same group (Users & RBAC) before anything crosses the node boundary.');

            return;
        }

        const table = jQuery('<table style="width:100%;border-collapse:collapse;font-size:12.5px"></table>').appendTo(mount);
        const headRow = jQuery('<tr></tr>').appendTo(jQuery('<thead></thead>').appendTo(table));

        for (const label of ['Node', 'Resource', 'Level', 'Group', 'Role', 'Permissions']) {
            jQuery(`<th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);color:var(--faint);font-weight:600">${ClusterView._esc(label)}</th>`).appendTo(headRow);
        }

        const tbody = jQuery('<tbody></tbody>').appendTo(table);

        for (const entry of entries) {
            const sourceNode = nodes.find((node) => node.nodeUid === entry.nodeUid);
            const row = jQuery('<tr></tr>').appendTo(tbody);
            const cell = (html: string): void => {
                jQuery(`<td style="padding:6px 8px;border-bottom:1px solid var(--line)">${html}</td>`).appendTo(row);
            };

            cell(ClusterView._esc(sourceNode?.host || sourceNode?.commonName || entry.nodeUid));
            cell(`<b>${ClusterView._esc(entry.resourceType)}</b>`);
            cell(ClusterView._esc(entry.level));
            cell(ClusterView._esc(entry.groupName || entry.groupUuid));
            cell(ClusterView._esc(entry.roleName || entry.roleId));
            cell(entry.permissionKeys.length > 0
                ? entry.permissionKeys.map((key) => `<span style="display:inline-block;margin:1px 3px 1px 0;padding:1px 6px;border-radius:10px;background:rgba(127,127,127,.14);font-family:var(--mono, monospace);font-size:11px">${ClusterView._esc(key)}</span>`).join('')
                : '<span style="color:var(--faint)">—</span>');
        }
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

        const nameInput = new FfxInput('form', 'Name');
        nameInput.setGrow('1', '160px');
        nameInput.getElement().appendTo(bd);

        const descInput = new FfxInput('form', 'Description (optional)');
        descInput.setGrow('2', '200px');
        descInput.getElement().appendTo(bd);

        const colorInput = new FfxColorInput();
        colorInput.getElement().appendTo(bd);

        const addBtn = new FfxButton('Create group', 'primary', 'form');
        addBtn.getElement().appendTo(bd);

        colorInput.setValue(UtilColor.getColor(`group-${Date.now()}`));

        addBtn.onClick(async(): Promise<void> => {
            const name = nameInput.getValue();

            if (name === '') {
                errOut.text('Name is required.');

                return;
            }

            errOut.text('');
            addBtn.setDisabled(true);

            try {
                await RegistryAPI.saveClusterNodeGroup({
                    name,
                    description: descInput.getValue(),
                    color: colorInput.getValue()
                });
                nameInput.setValue('');
                descInput.setValue('');
                await onSaved();
            } catch (e) {
                errOut.text('Could not create the group — needs the cluster.manage permission.');
            }

            addBtn.setDisabled(false);
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
        let shares: ClusterNodeGroupShare[] = [];
        let nodes: ClusterNode[] = [];

        try {
            const [groupsResponse, nodesResponse] = await Promise.all([
                RegistryAPI.getClusterNodeGroups(),
                RegistryAPI.getClusterNodes()
            ]);
            groups = groupsResponse.groups;
            members = groupsResponse.members;
            shares = groupsResponse.shares;
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
            const groupShares = shares.filter((s) => s.groupUuid === group.id);
            this._groupCard(list, group, groupMembers, groupShares, nodes, async(): Promise<void> => this._groupsBody(body));
        }
    }

    /**
     * One group's card: header (color dot, name, description, member count, edit, delete),
     * a membership checklist against every known node, and its sharing rules (9.5.12.4 —
     * which node exposes which resource type to this group, at what level). The
     * header/body toggle between a view render and an in-place edit-form render
     * (name/description/color); both are re-invoked locally, no full-list refresh needed
     * to flip between the two.
     * @param mount - list container
     * @param group - the group
     * @param memberUids - node uids currently in this group
     * @param groupShares - this group's sharing rules
     * @param nodes - every node in the roster (candidates for membership/sharing)
     * @param onChange - called after a successful save/delete/membership/share change
     * @protected
     */
    protected _groupCard(mount: JQuery, group: ClusterNodeGroup, memberUids: Set<string>, groupShares: ClusterNodeGroupShare[], nodes: ClusterNode[], onChange: () => Promise<void>): void {
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

            const editBtn = new FfxButton('Edit', 'neutral', 'list');
            editBtn.getElement().css('margin-left', 'auto').appendTo(hd);
            const delBtn = new FfxButton('Delete', 'danger', 'list');
            delBtn.getElement().appendTo(hd);

            editBtn.onClick((): void => renderEdit());

            delBtn.onClick(async(): Promise<void> => {
                if (!window.confirm(`Delete the group "${group.name}"? This removes all its memberships.`)) {
                    return;
                }

                delBtn.setDisabled(true);

                try {
                    await RegistryAPI.deleteClusterNodeGroup({id: group.id});
                    await onChange();
                } catch (e) {
                    delBtn.setDisabled(false);
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
                const row = new FfxCheckboxRow(node.host || node.commonName || node.nodeUid);
                row.setChecked(memberUids.has(node.nodeUid));
                row.getElement().appendTo(list);

                row.onChange(async(): Promise<void> => {
                    const member = row.isChecked();

                    row.setDisabled(true);

                    try {
                        await RegistryAPI.setClusterNodeGroupMembership({nodeUid: node.nodeUid, groupUuid: group.id, member});
                        await onChange();
                    } catch (e) {
                        row.setChecked(!member);
                        row.setDisabled(false);
                    }
                });
            }

            this._sharingSection(bd, group, groupShares, nodes, onChange);
        };

        const renderEdit = (): void => {
            hd.empty();
            bd.empty();

            jQuery('<span class="t">Edit group</span>').appendTo(hd);

            const form = jQuery('<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"></div>').appendTo(bd);

            const nameInput = new FfxInput('form', 'Name');
            nameInput.setGrow('1', '160px');
            nameInput.getElement().appendTo(form);

            const descInput = new FfxInput('form', 'Description (optional)');
            descInput.setGrow('2', '200px');
            descInput.getElement().appendTo(form);

            const colorInput = new FfxColorInput();
            colorInput.getElement().appendTo(form);

            const saveBtn = new FfxButton('Save', 'primary', 'form');
            saveBtn.getElement().appendTo(form);

            const cancelBtn = new FfxButton('Cancel', 'neutral', 'form');
            cancelBtn.getElement().appendTo(form);

            const err = jQuery('<div class="ffx-secnote" style="color:#c0392b;width:100%;margin:6px 0 0"></div>').appendTo(bd);

            nameInput.setValue(group.name);
            descInput.setValue(group.description);
            colorInput.setValue(group.color !== '' ? group.color : UtilColor.getColor(group.id));

            cancelBtn.onClick((): void => renderView());

            saveBtn.onClick(async(): Promise<void> => {
                const name = nameInput.getValue();

                if (name === '') {
                    err.text('Name is required.');

                    return;
                }

                err.text('');
                saveBtn.setDisabled(true);

                try {
                    await RegistryAPI.saveClusterNodeGroup({
                        id: group.id,
                        name,
                        description: descInput.getValue(),
                        color: colorInput.getValue()
                    });
                    await onChange();
                } catch (e) {
                    err.text('Could not save the group — needs the cluster.manage permission.');
                    saveBtn.setDisabled(false);
                }
            });
        };

        renderView();
    }

    /**
     * A group's sharing rules (Cluster/Mesh epic 9.5.12.4): the exposure boundary a
     * resource type must cross before an RBAC grant scoped to this group can apply.
     * Default-deny — a rule lists show for each existing share the source node + resource
     * type + level (editable in place) with a revoke button, plus a small form to add a
     * new share. Rendered into an existing card body (appended after the membership list).
     * @param mount - the card body to append into
     * @param group - the group the shares belong to
     * @param groupShares - this group's existing sharing rules
     * @param nodes - every node in the roster (candidate sharing sources)
     * @param onChange - called after a successful share/revoke
     * @protected
     */
    protected _sharingSection(mount: JQuery, group: ClusterNodeGroup, groupShares: ClusterNodeGroupShare[], nodes: ClusterNode[], onChange: () => Promise<void>): void {
        jQuery('<div style="margin:14px 0 4px;font-weight:600;font-size:12.5px">Sharing</div>').appendTo(mount);
        jQuery('<div style="color:var(--faint);font-size:11.5px;margin-bottom:8px">Which node exposes which resource type to this group, and at what level. Default-deny — nothing crosses the node boundary until granted here.</div>').appendTo(mount);

        const shareList = jQuery('<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px"></div>').appendTo(mount);

        if (groupShares.length === 0) {
            jQuery('<div style="color:var(--faint);font-size:12px">No sharing rules yet.</div>').appendTo(shareList);
        }

        for (const share of groupShares) {
            const sourceNode = nodes.find((node) => node.nodeUid === share.nodeUid);
            const row = jQuery('<div style="display:flex;align-items:center;gap:8px;font-size:12.5px"></div>').appendTo(shareList);

            jQuery(`<span style="flex:1">${ClusterView._esc(sourceNode?.host || sourceNode?.commonName || share.nodeUid)} → <b>${ClusterView._esc(share.resourceType)}</b></span>`).appendTo(row);

            const levelSelect = new FfxSelect('list', ClusterView._shareLevelOptions);
            levelSelect.setValue(share.level);
            levelSelect.getElement().appendTo(row);

            const revokeBtn = new FfxButton('Revoke', 'danger', 'xs');
            revokeBtn.getElement().appendTo(row);

            levelSelect.onChange(async(level): Promise<void> => {
                levelSelect.getElement().prop('disabled', true);

                try {
                    await RegistryAPI.setClusterNodeGroupShare({nodeUid: share.nodeUid, groupUuid: group.id, resourceType: share.resourceType, level});
                    await onChange();
                } catch (e) {
                    levelSelect.setValue(share.level);
                    levelSelect.getElement().prop('disabled', false);
                }
            });

            revokeBtn.onClick(async(): Promise<void> => {
                revokeBtn.setDisabled(true);

                try {
                    await RegistryAPI.deleteClusterNodeGroupShare({nodeUid: share.nodeUid, groupUuid: group.id, resourceType: share.resourceType});
                    await onChange();
                } catch (e) {
                    revokeBtn.setDisabled(false);
                }
            });
        }

        if (nodes.length === 0) {
            return;
        }

        const form = jQuery('<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"></div>').appendTo(mount);

        const nodeSelect = new FfxSelect('compact', nodes.map((node) => ({
            key: node.nodeUid,
            label: node.host || node.commonName || node.nodeUid
        })));
        nodeSelect.getElement().appendTo(form);

        const typeInput = new FfxInput('compact', 'Resource type (e.g. domain)');
        typeInput.setGrow('1', '140px');
        typeInput.getElement().appendTo(form);

        const levelInput = new FfxSelect('compact', ClusterView._shareLevelOptions);
        levelInput.getElement().appendTo(form);

        const shareBtn = new FfxButton('Share', 'primary', 'compact');
        shareBtn.getElement().appendTo(form);

        const err = jQuery('<div class="ffx-secnote" style="color:#c0392b;width:100%;margin:4px 0 0"></div>').appendTo(mount);

        shareBtn.onClick(async(): Promise<void> => {
            const resourceType = typeInput.getValue();

            if (resourceType === '') {
                err.text('Resource type is required.');

                return;
            }

            err.text('');
            shareBtn.setDisabled(true);

            try {
                await RegistryAPI.setClusterNodeGroupShare({
                    nodeUid: nodeSelect.getValue(),
                    groupUuid: group.id,
                    resourceType,
                    level: levelInput.getValue()
                });
                typeInput.setValue('');
                await onChange();
            } catch (e) {
                err.text('Could not save the share — needs the cluster.manage permission.');
                shareBtn.setDisabled(false);
            }
        });
    }

    /**
     * The two sharing levels offered everywhere a share's level is picked.
     * @protected
     */
    protected static readonly _shareLevelOptions: {key: string; label: string;}[] = [
        {key: 'read', label: 'read'},
        {key: 'write', label: 'write'}
    ];

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
