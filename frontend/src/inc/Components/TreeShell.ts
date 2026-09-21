import './tree-shell.css';

/**
 * A content tab for an entity: its label + a render callback that fills the content mount.
 */
export type FfxTab = {
    key: string;
    label: string;
    icon?: string;
    render: (mount: JQuery) => void;
};

/**
 * A tree entity — the Datacenter, a node, or a node resource. Selecting it re-scopes the
 * content area (object header + tabs).
 */
export type FfxEntity = {
    id: string;
    kind: 'datacenter' | 'node' | 'resource';
    title: string;
    subtitle?: string;
    icon?: string;
    avatar?: string;
    status?: 'up' | 'warn' | 'off';
    badges?: {label: string; cls?: string;}[];
    count?: {n: string; warn?: boolean;};
    tabs: FfxTab[];
    children?: FfxEntity[];
};

/**
 * TreeShell — a tree-based app shell (entity tree + content tabs) in the FlyingFish
 * `.ffr` design language (see tree-shell.css). A tree that holds entities (Datacenter →
 * nodes → resources); selecting one shows its object header + tabs, so it is always clear
 * which node you are configuring. First-in-FlyingFish; intended to become the whole-app
 * shell (9.5.12).
 */
export class TreeShell {

    protected readonly _tree: JQuery;

    protected readonly _crumb: JQuery;

    protected readonly _obj: JQuery;

    protected readonly _tabs: JQuery;

    protected readonly _content: JQuery;

    protected _root: FfxEntity | null = null;

    protected _selectedId: string | null = null;

    /**
     * @param parent - the element to render the shell into
     * @param onHome - optional callback for the brand/home row (navigation escape)
     */
    public constructor(parent: JQuery, onHome?: () => void) {
        const app = jQuery('<div class="ffx"></div>').appendTo(parent);

        this._tree = jQuery('<div class="ffx-tree"></div>').appendTo(app);

        if (onHome) {
            const home = jQuery('<div class="ffx-home"><span class="fin">🐟</span> FlyingFish <span class="back">← app</span></div>').appendTo(this._tree);
            home.on('click', () => onHome());
        }

        jQuery('<div class="ffx-viewsel">🖧 Server View <span class="ch">▾</span></div>').appendTo(this._tree);

        const main = jQuery('<div class="ffx-main"></div>').appendTo(app);
        this._crumb = jQuery('<div class="ffx-crumb"></div>').appendTo(main);
        this._obj = jQuery('<div class="ffx-obj"></div>').appendTo(main);
        this._tabs = jQuery('<div class="ffx-tabs"></div>').appendTo(main);
        this._content = jQuery('<div class="ffx-content"></div>').appendTo(main);
    }

    /**
     * Set the tree root (Datacenter with node children) and render the tree. Selects the
     * given entity id, or the root if none.
     * @param root - the datacenter entity (with node children)
     * @param selectId - optional id to select initially
     */
    public setRoot(root: FfxEntity, selectId?: string): void {
        this._root = root;
        this._renderTree();
        const initial = (selectId && this._find(selectId)) || root;
        this.select(initial.id);
    }

    /**
     * Select an entity by id: render its object header, tabs and first tab.
     * @param id - entity id
     */
    public select(id: string): void {
        const entity = this._find(id);

        if (entity === null) {
            return;
        }

        this._selectedId = id;
        this._renderTree();
        this._renderCrumb(entity);
        this._renderObj(entity);
        this._renderTabs(entity);
    }

    /**
     * Find an entity by id in the tree.
     * @param id - entity id
     * @protected
     */
    protected _find(id: string): FfxEntity | null {
        const walk = (e: FfxEntity): FfxEntity | null => {
            if (e.id === id) {
                return e;
            }

            for (const c of e.children ?? []) {
                const hit = walk(c);

                if (hit !== null) {
                    return hit;
                }
            }

            return null;
        };

        return this._root === null ? null : walk(this._root);
    }

    /**
     * @protected
     */
    protected _renderTree(): void {
        // keep the brand + view selector, drop the rest
        this._tree.children(':not(.ffx-viewsel):not(.ffx-home)').remove();

        if (this._root === null) {
            return;
        }

        this._treeRow(this._root, 0);

        for (const node of this._root.children ?? []) {
            this._treeRow(node, 1);

            if (node.id === this._selectedId || (node.children ?? []).some((r) => r.id === this._selectedId)) {
                for (const res of node.children ?? []) {
                    this._treeRow(res, 2);
                }
            }
        }
    }

    /**
     * Render one tree row.
     * @param entity - the entity
     * @param level - 0 datacenter, 1 node, 2 resource
     * @protected
     */
    protected _treeRow(entity: FfxEntity, level: number): void {
        const row = jQuery(`<div class="ffx-row ffx-lvl${level} ${entity.id === this._selectedId ? 'selected' : ''} ${entity.status === 'warn' ? 'pending' : ''}"></div>`).appendTo(this._tree);
        const twig = level === 2 ? '' : (entity.children && entity.children.length > 0 ? '▾' : '');
        jQuery(`<span class="tw">${twig}</span>`).appendTo(row);
        jQuery(`<span class="ic">${entity.icon ?? '•'}</span>`).appendTo(row);
        jQuery(`<span class="lbl">${TreeShell._esc(entity.title)}</span>`).appendTo(row);

        if (entity.status) {
            jQuery(`<span class="st ${entity.status}"></span>`).appendTo(row);
        }

        if (entity.count) {
            jQuery(`<span class="cnt ${entity.count.warn ? 'warn' : ''}">${TreeShell._esc(entity.count.n)}</span>`).appendTo(row);
        }

        row.on('click', () => this.select(entity.id));
    }

    /**
     * @param entity - selected
     * @protected
     */
    protected _renderCrumb(entity: FfxEntity): void {
        const parts = entity.kind === 'node'
            ? `<span>Datacenter</span><span class="sep">›</span><b>${TreeShell._esc(entity.title)}</b>`
            : `<b>${TreeShell._esc(entity.title)}</b>`;
        this._crumb.html(parts);
    }

    /**
     * @param entity - selected
     * @protected
     */
    protected _renderObj(entity: FfxEntity): void {
        this._obj.empty();
        jQuery(`<div class="avatar">${entity.avatar ?? entity.icon ?? '🖥️'}</div>`).appendTo(this._obj);
        const who = jQuery('<div></div>').appendTo(this._obj);
        const h1 = jQuery(`<h1>${TreeShell._esc(entity.title)}</h1>`).appendTo(who);

        if (entity.status) {
            const on = entity.status === 'up';
            jQuery(`<span class="ffx-statepill ${on ? 'up' : 'off'}">● ${on ? 'online' : (entity.status === 'warn' ? 'pending' : 'offline')}</span>`).appendTo(h1);
        }

        const sub = jQuery('<div class="sub"></div>').appendTo(who);

        for (const b of entity.badges ?? []) {
            jQuery(`<span class="ffx-bdg ${b.cls ?? 'plain'}">${TreeShell._esc(b.label)}</span> `).appendTo(sub);
        }

        if (entity.subtitle) {
            jQuery(`<span> ${entity.subtitle}</span>`).appendTo(sub);
        }
    }

    /**
     * @param entity - selected
     * @protected
     */
    protected _renderTabs(entity: FfxEntity): void {
        this._tabs.empty();
        this._content.empty();

        entity.tabs.forEach((tab, index) => {
            const el = jQuery(`<span class="ffx-tab ${index === 0 ? 'active' : ''}"><span class="ic">${tab.icon ?? ''}</span>${TreeShell._esc(tab.label)}</span>`).appendTo(this._tabs);
            el.on('click', () => {
                this._tabs.children('.ffx-tab').removeClass('active');
                el.addClass('active');
                this._content.empty();
                tab.render(this._content);
            });
        });

        if (entity.tabs.length > 0) {
            entity.tabs[0].render(this._content);
        }
    }

    /**
     * Minimal HTML escape for interpolated text.
     * @param value - raw text
     */
    public static _esc(value: string): string {
        return jQuery('<div></div>').text(value).html();
    }

}
