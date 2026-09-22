import './tree-shell.css';
import './ffr-skin.css';

/**
 * A leaf in the tree — one page, loaded into the content area via the app's loadPage.
 */
export type NavLeaf = {
    key: string;
    label: string;
    icon?: string;
    /** Factory for the page this leaf shows. */
    make: () => unknown;
};

/**
 * A category under a node (Router / Reverse Proxy / DNS / System) holding page leaves.
 */
export type NavGroup = {
    key: string;
    label: string;
    icon?: string;
    leaves: NavLeaf[];
};

/**
 * A content tab under the datacenter (the datacenter keeps a tab bar, Proxmox-style).
 */
export type NavTab = {
    key: string;
    label: string;
    icon?: string;
    group?: string;
    make: () => unknown;
};

/**
 * A tree entity: the Datacenter (with content tabs) or a node (with category groups).
 */
export type NavEntity = {
    id: string;
    kind: 'datacenter' | 'node';
    title: string;
    icon?: string;
    avatar?: string;
    status?: 'up' | 'warn' | 'off';
    badges?: {label: string; cls?: string;}[];
    subtitle?: string;
    /** Node operating mode; in 'attach' the Router category is hidden. */
    mode?: 'attach' | 'router';
    tabs?: NavTab[];
    groups?: NavGroup[];
};

/** Category keys that only apply in Router mode (hidden in Attach mode). */
const ROUTER_ONLY_GROUPS = ['router'];

/**
 * The whole-app navigation model: one Datacenter + N nodes.
 */
export type NavModel = {datacenter: NavEntity; nodes: NavEntity[];};

/**
 * ClusterNav — the whole-app navigation as an entity tree that REPLACES the admin-lte
 * sidebar: Datacenter (with content tabs) → nodes → category groups (Router · Reverse
 * Proxy · DNS · System) → page leaves. Selecting a node leaf loads its page; the node's
 * categories are expandable in the tree. The datacenter keeps a top tab bar. Rendered
 * fresh per page load; each leaf/tab maps to an existing page via the app's loadPage.
 */
export class ClusterNav {

    /** Expanded node categories, keyed `<nodeId>/<groupKey>` (persists across renders). */
    protected static _expanded: Set<string> = new Set();

    /** Last render inputs, so a category expand/collapse can re-render the tree. */
    protected static _last: {model: NavModel; currentKey: string; loadPage: (page: unknown) => void; username?: string;} | null = null;

    /**
     * Render the tree (into the admin-lte sidebar) + the object header / datacenter tabs.
     * @param model - the whole-app nav model
     * @param currentKey - the active page key (page.getName())
     * @param loadPage - the app's loadPage function
     * @param username - the current user (for the sidebar user panel)
     */
    public static render(model: NavModel, currentKey: string, loadPage: (page: unknown) => void, username?: string): void {
        jQuery('body').addClass('ffx-app');
        ClusterNav._last = {model, currentKey, loadPage, username};

        const owner = ClusterNav._ownerOf(model, currentKey);
        ClusterNav._renderTree();
        ClusterNav._renderTopbar(owner, currentKey, loadPage);
    }

    /**
     * The entity (datacenter or a node) that owns the given key.
     * @protected
     */
    protected static _ownerOf(model: NavModel, key: string): NavEntity {
        if ((model.datacenter.tabs ?? []).some((t) => t.key === key)) {
            return model.datacenter;
        }

        for (const node of model.nodes) {
            if ((node.groups ?? []).some((g) => g.leaves.some((l) => l.key === key))) {
                return node;
            }
        }

        return model.datacenter;
    }

    /**
     * The node's categories visible in the current mode (Router-only groups are hidden in
     * Attach mode).
     * @protected
     */
    protected static _visibleGroups(node: NavEntity): NavGroup[] {
        const groups = node.groups ?? [];

        if (node.mode === 'attach') {
            return groups.filter((g) => !ROUTER_ONLY_GROUPS.includes(g.key));
        }

        return groups;
    }

    /**
     * Re-render the tree from the last inputs (used when a category is toggled).
     * @protected
     */
    protected static _renderTree(): void {
        const last = ClusterNav._last;

        if (last === null) {
            return;
        }

        const {model, currentKey, loadPage, username} = last;
        const sb = jQuery('.main-sidebar');

        if (sb.length === 0) {
            return;
        }

        sb.empty().addClass('ffx-sb');
        jQuery('<div class="ffx-brand"><span class="fin">🐟</span> FlyingFish</div>').appendTo(sb);

        if (username) {
            const user = jQuery('<div class="ffx-user"></div>').appendTo(sb);
            jQuery('<span class="av"></span>').text(username.slice(0, 2)).appendTo(user);
            jQuery('<span class="un"></span>').text(username).appendTo(user);
        }

        jQuery('<div class="ffx-viewsel"><span class="ic">🗂️</span> Server View <span class="ch">▾</span></div>').appendTo(sb);

        const tree = jQuery('<div class="ffx-treebox"></div>').appendTo(sb);
        const owner = ClusterNav._ownerOf(model, currentKey);
        const dc = model.datacenter;

        // Datacenter (content tabs); selected when a datacenter tab is active
        ClusterNav._treeRow(tree, {
            level: 0, icon: dc.icon, label: dc.title, caret: '▾',
            selected: owner.id === dc.id,
            onClick: () => loadPage((dc.tabs ?? [])[0]?.make())
        });

        for (const node of model.nodes) {
            const nodeSel = owner.id === node.id;
            const groups = ClusterNav._visibleGroups(node);
            ClusterNav._treeRow(tree, {
                level: 1, icon: node.icon, label: node.title, status: node.status,
                caret: groups.length > 0 ? (nodeSel ? '▾' : '▸') : '',
                selected: false, dim: node.status === 'warn',
                onClick: () => loadPage(groups[0]?.leaves[0]?.make())
            });

            if (!nodeSel) {
                continue;
            }

            for (const group of groups) {
                const gKey = `${node.id}/${group.key}`;
                const activeGroup = group.leaves.some((l) => l.key === currentKey);
                const expanded = activeGroup || ClusterNav._expanded.has(gKey);

                ClusterNav._treeRow(tree, {
                    level: 2, icon: group.icon, label: group.label, caret: expanded ? '▾' : '▸',
                    selected: false,
                    onClick: () => {
                        if (ClusterNav._expanded.has(gKey)) {
                            ClusterNav._expanded.delete(gKey);
                        } else {
                            ClusterNav._expanded.add(gKey);
                        }

                        ClusterNav._renderTree();
                    }
                });

                if (!expanded) {
                    continue;
                }

                for (const leaf of group.leaves) {
                    ClusterNav._treeRow(tree, {
                        level: 3, icon: leaf.icon, label: leaf.label,
                        selected: leaf.key === currentKey,
                        onClick: () => loadPage(leaf.make())
                    });
                }
            }
        }

        // footer: node health counts
        const online = model.nodes.filter((n) => n.status === 'up').length;
        const pending = model.nodes.filter((n) => n.status === 'warn').length;
        const foot = `${online} node${online === 1 ? '' : 's'} online${pending > 0 ? ` · ${pending} pending` : ''}`;
        jQuery('<div class="ffx-foot"></div>').text(foot).appendTo(sb);
    }

    /**
     * One tree row.
     * @protected
     */
    protected static _treeRow(tree: JQuery, opts: {level: number; icon?: string; label: string; selected: boolean; caret?: string; status?: string; dim?: boolean; onClick: () => void;}): JQuery {
        const row = jQuery(`<div class="ffx-row ffx-lvl${opts.level} ${opts.selected ? 'selected' : ''} ${opts.dim ? 'pending' : ''}"></div>`).appendTo(tree);
        jQuery(`<span class="tw">${opts.caret ?? ''}</span>`).appendTo(row);
        jQuery(`<span class="ic">${opts.icon ?? '•'}</span>`).appendTo(row);
        jQuery(`<span class="lbl">${ClusterNav._esc(opts.label)}</span>`).appendTo(row);

        if (opts.status) {
            jQuery(`<span class="st ${opts.status}"></span>`).appendTo(row);
        }

        row.on('click', (event) => {
            event.stopPropagation();
            opts.onClick();
        });

        return row;
    }

    /**
     * Render the breadcrumb (into the top navbar) + object header, and — for the
     * datacenter only — the content tab bar. Node pages navigate via the tree.
     * @protected
     */
    protected static _renderTopbar(owner: NavEntity, currentKey: string, loadPage: (page: unknown) => void): void {
        const isDc = owner.kind === 'datacenter';

        // the content tabs: datacenter → its tabs; node → the current category's page leaves
        let tabItems: NavTab[] = [];
        let groupLabel = '';

        if (isDc) {
            tabItems = owner.tabs ?? [];
        } else {
            const groups = ClusterNav._visibleGroups(owner);
            const group = groups.find((g) => g.leaves.some((l) => l.key === currentKey)) ?? groups[0];
            groupLabel = group?.label ?? '';
            tabItems = (group?.leaves ?? []).map((l) => ({key: l.key, label: l.label, icon: l.icon, make: l.make}));
        }

        // breadcrumb → top navbar (single top bar)
        const crumb = isDc
            ? `<b>${ClusterNav._esc(owner.title)}</b>`
            : `<span>Datacenter</span><span class="sep">›</span><b>${ClusterNav._esc(owner.title)}</b>${groupLabel ? `<span class="sep">›</span><span>${ClusterNav._esc(groupLabel)}</span>` : ''}`;
        const header = jQuery('.main-header');
        header.find('.ffx-crumb').remove();

        if (header.length > 0) {
            jQuery(`<div class="ffx-crumb">${crumb}</div>`).prependTo(header);
        }

        const cw = jQuery('.content-wrapper');

        if (cw.length === 0) {
            return;
        }

        cw.find('.ffx-topbar').remove();
        const bar = jQuery('<div class="ffx-topbar"></div>');

        const obj = jQuery('<div class="ffx-obj"></div>').appendTo(bar);
        jQuery(`<div class="avatar">${owner.avatar ?? owner.icon ?? '🖥️'}</div>`).appendTo(obj);
        const who = jQuery('<div></div>').appendTo(obj);
        const h1 = jQuery(`<h1>${ClusterNav._esc(owner.title)}</h1>`).appendTo(who);

        if (owner.status) {
            const on = owner.status === 'up';
            jQuery(`<span class="ffx-statepill ${on ? 'up' : 'off'}">● ${on ? 'online' : (owner.status === 'warn' ? 'pending' : 'offline')}</span>`).appendTo(h1);
        }

        const sub = jQuery('<div class="sub"></div>').appendTo(who);

        for (const b of owner.badges ?? []) {
            jQuery(`<span class="ffx-bdg ${b.cls ?? 'plain'}">${ClusterNav._esc(b.label)}</span> `).appendTo(sub);
        }

        if (owner.subtitle) {
            jQuery(`<span> ${owner.subtitle}</span>`).appendTo(sub);
        }

        // content tabs: the current category's pages (node) or the datacenter tabs.
        // Clicking a tab loads its page; the tree marks the same leaf (both key off currentKey).
        if (tabItems.length > 0) {
            const tabs = jQuery('<div class="ffx-tabs"></div>').appendTo(bar);
            let prevGroup: string | undefined;

            tabItems.forEach((tab, index) => {
                if (index > 0 && tab.group !== undefined && tab.group !== prevGroup) {
                    jQuery('<span class="ffx-tabsep"></span>').appendTo(tabs);
                }

                prevGroup = tab.group;
                const el = jQuery(`<span class="ffx-tab ${tab.key === currentKey ? 'active' : ''}"><span class="ic">${tab.icon ?? ''}</span>${ClusterNav._esc(tab.label)}</span>`).appendTo(tabs);
                el.on('click', () => loadPage(tab.make()));
            });
        } else {
            bar.addClass('ffx-topbar-notabs');
        }

        cw.prepend(bar);
    }

    /**
     * Minimal HTML escape.
     * @param value - raw text
     */
    public static _esc(value: string): string {
        return jQuery('<div></div>').text(value).html();
    }

}
