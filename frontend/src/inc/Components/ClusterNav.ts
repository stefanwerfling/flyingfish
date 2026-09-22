import './tree-shell.css';
import './ffr-skin.css';

/**
 * A tab under an entity — maps to a page loaded into the content area.
 */
export type NavTab = {
    key: string;
    label: string;
    icon?: string;
    /** Optional group id; a divider is drawn where the group changes between tabs. */
    group?: string;
    /** Factory for the page this tab shows (loaded via the app's loadPage). */
    make: () => unknown;
};

/**
 * A tree entity (Datacenter or a node) with its content tabs + optional resource leaves.
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
    tabs: NavTab[];
    resources?: {id: string; title: string; icon?: string; tabKey: string;}[];
    count?: {n: string; warn?: boolean;};
};

/**
 * The whole-app navigation model: one Datacenter + N nodes.
 */
export type NavModel = {datacenter: NavEntity; nodes: NavEntity[];};

/**
 * ClusterNav — the whole-app navigation as an entity tree (Datacenter → nodes → resources)
 * that REPLACES the admin-lte sidebar, plus an object header + content tabs above the page
 * content. Every tab maps to an existing page loaded via the app's loadPage, so the tree is
 * the single navigation for the entire app (no separate menu). Rendered fresh on each page
 * load, highlighting the active tab. First-in-FlyingFish shell (9.5.12).
 */
export class ClusterNav {

    /**
     * Render the tree (into the admin-lte sidebar) + the object header/tabs (above the
     * content) for the page identified by `currentKey`.
     * @param model - the whole-app nav model
     * @param currentKey - the active tab key
     * @param loadPage - the app's loadPage function
     */
    public static render(model: NavModel, currentKey: string, loadPage: (page: unknown) => void, username?: string): void {
        jQuery('body').addClass('ffx-app');

        const owner = ClusterNav._ownerOf(model, currentKey);
        ClusterNav._renderTree(model, owner, currentKey, loadPage, username);
        ClusterNav._renderTopbar(owner, currentKey, loadPage);
    }

    /**
     * The entity that owns the given tab key (defaults to the datacenter).
     * @protected
     */
    protected static _ownerOf(model: NavModel, key: string): NavEntity {
        const all = [model.datacenter, ...model.nodes];

        for (const e of all) {
            if (e.tabs.some((t) => t.key === key)) {
                return e;
            }
        }

        return model.datacenter;
    }

    /**
     * Render the entity tree into the admin-lte sidebar.
     * @protected
     */
    protected static _renderTree(model: NavModel, owner: NavEntity, currentKey: string, loadPage: (page: unknown) => void, username?: string): void {
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

        const dc = model.datacenter;
        ClusterNav._row(tree, dc, 0, owner.id === dc.id, () => loadPage(dc.tabs[0].make()));

        for (const node of model.nodes) {
            const selected = owner.id === node.id;
            ClusterNav._row(tree, node, 1, selected, () => loadPage(node.tabs[0].make()));

            if (selected) {
                for (const res of node.resources ?? []) {
                    const tab = node.tabs.find((t) => t.key === res.tabKey);
                    const row = ClusterNav._row(tree, {id: res.id, kind: 'node', title: res.title, icon: res.icon, tabs: []}, 2, res.tabKey === currentKey, () => tab && loadPage(tab.make()));
                    row.toggleClass('selected', res.tabKey === currentKey);
                }
            }
        }

        // footer: node health counts (mock parity)
        const online = model.nodes.filter((n) => n.status === 'up').length;
        const pending = model.nodes.filter((n) => n.status === 'warn').length;
        const foot = `${online} node${online === 1 ? '' : 's'} online${pending > 0 ? ` · ${pending} pending` : ''}`;
        jQuery('<div class="ffx-foot"></div>').text(foot).appendTo(sb);
    }

    /**
     * One tree row.
     * @protected
     */
    protected static _row(tree: JQuery, entity: NavEntity, level: number, selected: boolean, onClick: () => void): JQuery {
        const row = jQuery(`<div class="ffx-row ffx-lvl${level} ${selected ? 'selected' : ''} ${entity.status === 'warn' ? 'pending' : ''}"></div>`).appendTo(tree);
        const twig = level === 2 ? '' : ((entity.tabs.length > 0 && entity.kind !== 'datacenter') || entity.kind === 'datacenter' ? '▾' : '');
        jQuery(`<span class="tw">${level === 2 ? '' : twig}</span>`).appendTo(row);
        jQuery(`<span class="ic">${entity.icon ?? '•'}</span>`).appendTo(row);
        jQuery(`<span class="lbl">${ClusterNav._esc(entity.title)}</span>`).appendTo(row);

        if (entity.status) {
            jQuery(`<span class="st ${entity.status}"></span>`).appendTo(row);
        }

        if (entity.count) {
            jQuery(`<span class="cnt ${entity.count.warn ? 'warn' : ''}">${ClusterNav._esc(entity.count.n)}</span>`).appendTo(row);
        }

        row.on('click', () => onClick());

        return row;
    }

    /**
     * Render the object header + tab bar above the page content.
     * @protected
     */
    protected static _renderTopbar(owner: NavEntity, currentKey: string, loadPage: (page: unknown) => void): void {
        const cw = jQuery('.content-wrapper');

        if (cw.length === 0) {
            return;
        }

        // breadcrumb goes into the top navbar so there is a single top bar (crumb left,
        // the page actions + fullscreen/theme/logout right), matching the mock.
        const crumb = owner.kind === 'node'
            ? `<span>Datacenter</span><span class="sep">›</span><b>${ClusterNav._esc(owner.title)}</b>`
            : `<b>${ClusterNav._esc(owner.title)}</b>`;
        const header = jQuery('.main-header');
        header.find('.ffx-crumb').remove();

        if (header.length > 0) {
            jQuery(`<div class="ffx-crumb">${crumb}</div>`).prependTo(header);
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

        const tabs = jQuery('<div class="ffx-tabs"></div>').appendTo(bar);

        let prevGroup: string | undefined;

        owner.tabs.forEach((tab, index) => {
            if (index > 0 && tab.group !== undefined && tab.group !== prevGroup) {
                jQuery('<span class="ffx-tabsep"></span>').appendTo(tabs);
            }

            prevGroup = tab.group;
            const el = jQuery(`<span class="ffx-tab ${tab.key === currentKey ? 'active' : ''}"><span class="ic">${tab.icon ?? ''}</span>${ClusterNav._esc(tab.label)}</span>`).appendTo(tabs);
            el.on('click', () => loadPage(tab.make()));
        });

        // place the bar at the very top of the content-wrapper, above the page content
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
