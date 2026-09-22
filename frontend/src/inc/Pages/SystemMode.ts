import {ContentCol, ContentColSize} from 'bambooo';
import {BasePage} from './BasePage.js';
import '../Components/tree-shell.css';

/** localStorage key holding the (frontend-only, for now) node operating mode. */
export const NODE_MODE_KEY = 'ff-node-mode';

/**
 * Read the current node operating mode (attach|router). Frontend placeholder until the
 * backend SystemConfig lands; defaults to 'attach' (single-interface).
 */
export function getNodeMode(): 'attach' | 'router' {
    try {
        return window.localStorage.getItem(NODE_MODE_KEY) === 'router' ? 'router' : 'attach';
    } catch (e) {
        return 'attach';
    }
}

/**
 * SystemMode — the node operating-mode switch (System → Mode). Attach = single interface
 * (Router area hidden); Router = WAN + LAN (Router area shown). Frontend-only for now
 * (persists to localStorage and re-renders the nav); the real per-node SystemConfig
 * (mode · target IP · attach interface) and the service wiring land in the backend step.
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
        jQuery('<div class="ffx-secnote">How this FlyingFish node uses its network. Changing the mode is a frontend preview for now — the backend wiring (SystemConfig, DNS/Nginx targets) follows.</div>').appendTo(page);

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
            btn.on('click', () => {
                try {
                    window.localStorage.setItem(NODE_MODE_KEY, mode);
                } catch (e) {
                    // storage unavailable — mode won't persist this session
                }

                // reload the page so index.ts rebuilds the nav with the new mode
                // (shows/hides the Router category)
                this._loadPageFn?.(new SystemMode());
            });
        }
    }

}
