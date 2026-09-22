import {ButtonMenu, ButtonType, IconFa} from 'bambooo';
import {ListenData} from 'flyingfish_schemas';
import {ListenAddressCheckType, ListenTypes} from '../../Api/Listen.js';
import './listens-cards.css';

/**
 * Menu actions a listen card offers (wired by the Listens page).
 */
export type ListenCardActions = {
    onEdit: () => void;
    onDelete?: () => void;
};

/**
 * ListenCard — one listener as a clean card in the cluster-mock style: a header with the
 * port as title, the name, a status pill and an action menu, over a key/value body
 * (type, protocol, where it routes, and the enabled options).
 */
export class ListenCard {

    /**
     * @param parent - the grid element to render into
     * @param entry - the listen
     * @param actions - edit/delete callbacks
     */
    public constructor(parent: JQuery, entry: ListenData, actions: ListenCardActions) {
        const stream = entry.type === ListenTypes.stream;
        const card = jQuery('<div class="lc-card"></div>').appendTo(parent);

        // ---- header ----
        const hd = jQuery('<div class="lc-hd"></div>').appendTo(card);
        jQuery('<span class="t"></span>').text(`:${entry.port}`).appendTo(hd);
        jQuery('<span class="nm"></span>').text(entry.name || '—').appendTo(hd);
        jQuery('<span class="sp"></span>').appendTo(hd);
        jQuery(`<span class="lc-statepill ${entry.disable ? 'off' : 'up'}">● ${entry.disable ? 'disabled' : 'enabled'}</span>`).appendTo(hd);

        const menuWrap = jQuery('<span class="lc-menu"></span>').appendTo(hd);
        const menu = new ButtonMenu(menuWrap[0] as unknown as HTMLElement, IconFa.bars, true, ButtonType.borderless);
        menu.addMenuItem('Edit', actions.onEdit, IconFa.edit);

        if (actions.onDelete) {
            menu.addDivider();
            menu.addMenuItem('Delete', actions.onDelete, IconFa.trash);
        }

        // ---- body: key/value ----
        const bd = jQuery('<div class="lc-bd"></div>').appendTo(card);
        const dl = jQuery('<dl class="lc-kv"></dl>').appendTo(bd);

        ListenCard._row(dl, 'Type', stream ? 'stream · L4' : 'http · L7', false);
        ListenCard._row(dl, 'Protocol', stream ? ListenCard._proto(entry.protocol) : 'HTTP/HTTPS', false);
        ListenCard._row(dl, 'Routes to', ListenCard._flow(entry), true);
        ListenCard._row(dl, 'Options', ListenCard._options(entry), false);

        if (entry.description) {
            ListenCard._row(dl, 'Note', entry.description, false);
        }
    }

    /**
     * Append one key/value row.
     * @param dl - the definition list
     * @param key - the label
     * @param value - the value
     * @param mono - render the value monospace
     * @protected
     */
    protected static _row(dl: JQuery, key: string, value: string, mono: boolean): void {
        jQuery('<dt></dt>').text(key).appendTo(dl);
        jQuery(`<dd${mono ? ' class="mono"' : ''}></dd>`).text(value).appendTo(dl);
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
     * The enabled options as a compact list ("—" when none).
     * @param entry - the listen
     * @protected
     */
    protected static _options(entry: ListenData): string {
        const opt: string[] = [];

        if (entry.enable_ipv6) {
            opt.push('IPv6');
        }

        if (entry.proxy_protocol) {
            opt.push('proxy');
        }

        if (entry.proxy_protocol_in) {
            opt.push('proxy-in');
        }

        if (entry.check_address) {
            opt.push(`IP ${entry.check_address_type === ListenAddressCheckType.white ? 'whitelist' : 'blacklist'}`);
        }

        return opt.length > 0 ? opt.join(' · ') : '—';
    }

    /**
     * Where a listener's traffic flows next.
     * @param entry - the listen
     * @protected
     */
    protected static _flow(entry: ListenData): string {
        if (entry.type !== ListenTypes.stream) {
            return '→ backend';
        }

        const n = (entry.name || '').toLowerCase();

        if (entry.port === 53 || n.includes('dns')) {
            return '→ DNS server';
        }

        if (entry.port === 443 || n.includes('ssl') || n.includes('https')) {
            return '→ :10443 (https)';
        }

        if (entry.port === 80 || n.includes('http')) {
            return '→ :10080 (http)';
        }

        return '→ upstream';
    }

}
