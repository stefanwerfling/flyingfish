import {ButtonMenu, ButtonType, IconFa} from 'bambooo';
import {ListenData} from 'flyingfish_schemas';
import {ListenAddressCheckType, ListenTypes} from '../../Api/Listen.js';
import '../Router/router.css';
import './listens-cards.css';

/**
 * Menu actions a listen card offers (wired by the Listens page).
 */
export type ListenCardActions = {
    onEdit: () => void;
    onDelete?: () => void;
};

/**
 * ListenCard — one self-contained card per listener, in the FlyingFish `.ffr` design
 * language (same look as the Router page's interface cards): a status LED, the port as
 * the title, a stream/http role badge, and inline detail sections (protocol + where the
 * traffic flows, plus the enabled options), with a per-card edit/delete menu.
 */
export class ListenCard {

    /**
     * @param parent - the grid element to render into
     * @param entry - the listen
     * @param actions - edit/delete callbacks
     */
    public constructor(parent: JQuery, entry: ListenData, actions: ListenCardActions) {
        const stream = entry.type === ListenTypes.stream;
        const roleColor = stream ? 'var(--ffr-warn)' : 'var(--ffr-ok)';
        const card = jQuery('<div class="ffr-card"></div>').appendTo(parent);

        // ---- header ----
        const top = jQuery('<div class="ffr-top"></div>').appendTo(card);
        jQuery(`<span class="ffr-led ${entry.disable ? 'idle' : 'up'}"></span>`).appendTo(top);

        const info = jQuery('<div style="min-width:0"></div>').appendTo(top);
        const nameRow = jQuery('<div class="ffr-name"></div>').appendTo(info);

        // reachability at a glance: 🌐 public (external) vs 🔒 internal-only
        const internal = ListenCard._isInternal(entry);
        jQuery(`<span class="lc-reach" title="${internal ? 'internal only' : 'public · reachable from the internet'}">${internal ? '🔒' : '🌐'}</span>`).appendTo(nameRow);

        jQuery(`<b>:${entry.port}</b>`).appendTo(nameRow);
        jQuery(`<span class="ffr-role" style="background:${roleColor}">${stream ? 'stream' : 'http'}</span>`).appendTo(nameRow);

        if (entry.disable) {
            jQuery('<span class="ffr-role idle">disabled</span>').appendTo(nameRow);
        }

        jQuery('<div class="ffr-name"></div>').append(jQuery('<span class="ffr-macx"></span>').text(entry.name || '—')).appendTo(info);

        // ---- menu ----
        const menuWrap = jQuery('<div class="ffr-menu"></div>').appendTo(top);
        const menu = new ButtonMenu(menuWrap[0] as unknown as HTMLElement, IconFa.bars, true, ButtonType.borderless);
        menu.addMenuItem('Edit', actions.onEdit, IconFa.edit);

        if (actions.onDelete) {
            menu.addDivider();
            menu.addMenuItem('Delete', actions.onDelete, IconFa.trash);
        }

        // ---- body: details ----
        const details = jQuery('<div class="ffr-sec"></div>').appendTo(card);
        jQuery('<div class="ffr-sec-hd"><span class="ffr-eyebrow">Details</span></div>').appendTo(details);
        ListenCard._kv(details, [
            ['Type', stream ? 'stream · L4' : 'http · L7'],
            ['Protocol', stream ? ListenCard._proto(entry.protocol) : 'HTTP/HTTPS'],
            ...(entry.description ? [['Note', entry.description] as [string, string]] : [])
        ]);

        // ---- body: options ----
        const opt = jQuery('<div class="ffr-sec"></div>').appendTo(card);
        jQuery('<div class="ffr-sec-hd"><span class="ffr-eyebrow">Options</span></div>').appendTo(opt);
        const chips = jQuery('<div class="lc-chips"></div>').appendTo(opt);
        let any = false;

        if (entry.enable_ipv6) {
            jQuery('<span class="ffr-badge v6">IPv6</span>').appendTo(chips); any = true;
        }

        if (entry.proxy_protocol) {
            jQuery('<span class="ffr-badge proto">proxy</span>').appendTo(chips); any = true;
        }

        if (entry.proxy_protocol_in) {
            jQuery('<span class="ffr-badge proto">proxy-in</span>').appendTo(chips); any = true;
        }

        if (entry.check_address) {
            const kind = entry.check_address_type === ListenAddressCheckType.white ? 'whitelist' : 'blacklist';
            jQuery(`<span class="ffr-badge v4">IP ${kind}</span>`).appendTo(chips); any = true;
        }

        if (!any) {
            chips.remove();
            jQuery('<div class="ffr-empty">No options set.</div>').appendTo(opt);
        }
    }

    /**
     * Whether a listener is internal-only (not reachable from the internet). Honours an
     * explicit "intern"/"extern" in the name, else falls back to the type (http listens —
     * :10080/:10443 — are the internal L7 servers; stream listens are the published ports).
     * @param entry - the listen
     * @protected
     */
    protected static _isInternal(entry: ListenData): boolean {
        const n = (entry.name || '').toLowerCase();

        if (n.includes('intern')) {
            return true;
        }

        if (n.includes('extern')) {
            return false;
        }

        return entry.type !== ListenTypes.stream;
    }

    /**
     * The protocol label for a stream listen.
     * @param protocol - 0 TCP · 1 UDP · 2 TCP & UDP
     * @protected
     */
    protected static _proto(protocol?: number): string {
        switch (protocol) {
            case 1: return 'UDP';
            case 2: return 'TCP & UDP';
            default: return 'TCP';
        }
    }

    /**
     * Append a key/value grid.
     * @param parent - the container
     * @param rows - [label, value] pairs
     * @protected
     */
    protected static _kv(parent: JQuery, rows: [string, string][]): void {
        const dl = jQuery('<dl class="ffr-kv"></dl>').appendTo(parent);

        for (const row of rows) {
            jQuery('<dt></dt>').text(row[0]).appendTo(dl);
            jQuery('<dd></dd>').text(row[1]).appendTo(dl);
        }
    }

}
