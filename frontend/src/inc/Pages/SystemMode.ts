import {ContentCol, ContentColSize} from 'bambooo';
import {System as SystemAPI} from '../Api/System.js';
import {BasePage} from './BasePage.js';
import '../Components/tree-shell.css';

/** localStorage key mirroring the node mode (fallback when the backend isn't reachable). */
export const NODE_MODE_KEY = 'ff-node-mode';

/** Cached mode (from the backend, or the localStorage fallback). */
let cachedMode: 'attach' | 'router' | null = null;
let loaded = false;

/**
 * The current node operating mode (attach|router) — the cached backend value, else the
 * localStorage fallback, else 'attach'. Synchronous; call {@link loadNodeConfig} once at
 * startup to populate the cache from the backend.
 */
export function getNodeMode(): 'attach' | 'router' {
    if (cachedMode !== null) {
        return cachedMode;
    }

    try {
        return window.localStorage.getItem(NODE_MODE_KEY) === 'router' ? 'router' : 'attach';
    } catch (e) {
        return 'attach';
    }
}

/**
 * Load the node config from the backend once and cache it. Falls back silently to the
 * localStorage value if the endpoint isn't available yet (backend not deployed).
 */
export async function loadNodeConfig(): Promise<void> {
    if (loaded) {
        return;
    }

    loaded = true;

    try {
        const config = await SystemAPI.getConfig();
        cachedMode = config.mode === 'router' ? 'router' : 'attach';

        try {
            window.localStorage.setItem(NODE_MODE_KEY, cachedMode);
        } catch (e) {
            // storage unavailable — cache still holds the value for this session
        }
    } catch (e) {
        // backend/endpoint not available yet — keep the localStorage fallback
        cachedMode = null;
    }
}

/**
 * SystemMode — the node operating-mode switch (System → Mode). Attach = single interface
 * (Router area hidden); Router = WAN + LAN (Router area shown). Backed by the node's
 * SystemConfig via the API, with a localStorage fallback while the backend rolls out.
 */
export class SystemMode extends BasePage {

    protected override _name: string = 'mode';

    /**
     * constructor
     */
    public constructor() {
        super();
        this.setTitle('Mode');
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();
        const col = new ContentCol(content, ContentColSize.col12);
        const page = jQuery('<div class="ffx-page"></div>').appendTo(jQuery(col.getElement()));

        jQuery('<div class="ffx-sectitle">Operating mode</div>').appendTo(page);
        jQuery('<div class="ffx-secnote">How this FlyingFish node uses its network. Attach = single interface; Router = WAN + LAN with NAT/DHCP/forwarding.</div>').appendTo(page);

        const current = getNodeMode();
        const grid = jQuery('<div class="sm-grid"></div>').appendTo(page);

        this._option(grid, current, 'attach', '🖧', 'Attach',
            'Single interface. Gateway and targets share the host\'s NIC — FlyingFish is a service on an existing network. The Router area is hidden.');
        this._option(grid, current, 'router', '🧭', 'Router',
            'WAN + LAN. Gets the gateway on one interface and routes to a second — NAT, DHCP and port-forwarding. Enables the Router area.');
    }

    /**
     * Render one selectable mode option card.
     * @param grid - the container
     * @param current - the active mode
     * @param mode - this option's mode
     * @param icon - option icon
     * @param title - option title
     * @param note - option description
     * @protected
     */
    protected _option(grid: JQuery, current: string, mode: 'attach' | 'router', icon: string, title: string, note: string): void {
        const active = current === mode;
        const card = jQuery(`<div class="sm-card ${active ? 'active' : ''}"></div>`).appendTo(grid);
        jQuery(`<div class="sm-hd"><span class="sm-ic">${icon}</span><span class="sm-t">${title}</span>${active ? '<span class="sm-badge">active</span>' : ''}</div>`).appendTo(card);
        jQuery('<div class="sm-note"></div>').text(note).appendTo(card);

        if (!active) {
            const btn = jQuery(`<button class="sm-btn" type="button">Switch to ${title}</button>`).appendTo(card);
            btn.on('click', async(): Promise<void> => {
                try {
                    await SystemAPI.saveConfig({mode});
                } catch (e) {
                    // backend not available yet — the localStorage fallback keeps it working
                }

                cachedMode = mode;

                try {
                    window.localStorage.setItem(NODE_MODE_KEY, mode);
                } catch (e) {
                    // storage unavailable — cache still holds it for this session
                }

                // reload so index.ts rebuilds the nav with the new mode (shows/hides Router)
                this._loadPageFn?.(new SystemMode());
            });
        }
    }

}
