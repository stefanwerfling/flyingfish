import {ButtonMenu, ButtonType, IconFa} from 'bambooo';
import {PortForwardEntry} from 'flyingfish_schemas';

/**
 * Menu actions the port-forward panel offers (wired by the Router page).
 */
export type PortForwardActions = {
    onAdd: () => void;
    onEdit: (entry: PortForwardEntry) => void;
    onDelete: (entry: PortForwardEntry) => void;
};

/**
 * PortForwardPanel — the "Port Forwarding & Firewall" panel (Pi-router epic, Phase 2).
 * A full-width card below the interface grid listing each inbound rule as a row:
 * `WAN :port → host:port` (or a "Router" pill), proto/family tags, an enabled LED and a
 * description, with a per-row edit/delete menu and a header "Add rule" button. Every rule
 * is a controlled hole in the WAN input firewall (Phase 1); an empty list means the WAN
 * is fully closed.
 */
export class PortForwardPanel {

    /**
     * @param parent - the element to render the panel into
     * @param rules - the port-forward rules (from the overview)
     * @param actions - add/edit/delete callbacks
     */
    public constructor(parent: JQuery, rules: PortForwardEntry[], actions: PortForwardActions) {
        const panel = jQuery('<div class="ffr-fw"></div>').appendTo(parent);

        // ---- header ----------------------------------------------------------------------------------------------
        const head = jQuery('<div class="ffr-fw-head"></div>').appendTo(panel);
        const title = jQuery('<div class="ffr-fw-title"></div>').appendTo(head);
        jQuery('<div class="ffr-eyebrow">Port Forwarding &amp; Firewall</div>').appendTo(title);
        jQuery('<div class="ffr-fw-sub">Inbound rules punch controlled holes in the closed WAN firewall.</div>').appendTo(title);

        const addBtn = jQuery(`<button class="ffr-fw-add" type="button"><i class="${IconFa.add}"></i>Add rule</button>`).appendTo(head);
        addBtn.on('click', (): void => actions.onAdd());

        // ---- rows ------------------------------------------------------------------------------------------------
        if (rules.length === 0) {
            jQuery('<div class="ffr-fw-empty">No inbound rules — the WAN firewall is fully closed.</div>').appendTo(panel);

            return;
        }

        const list = jQuery('<div class="ffr-fw-list"></div>').appendTo(panel);

        for (const rule of rules) {
            PortForwardPanel._renderRow(list, rule, actions);
        }
    }

    /**
     * Render one rule row.
     * @param list - the list element
     * @param rule - the rule
     * @param actions - the callbacks
     * @protected
     */
    protected static _renderRow(list: JQuery, rule: PortForwardEntry, actions: PortForwardActions): void {
        const row = jQuery(`<div class="ffr-fw-row ${rule.enabled ? '' : 'off'}"></div>`).appendTo(list);

        jQuery('<span class="ffr-fw-led"></span>').appendTo(row);

        const map = jQuery('<div class="ffr-fw-map"></div>').appendTo(row);
        const wan = PortForwardPanel._wanLabel(rule);

        if (rule.target_type === 'router') {
            jQuery(`<span>WAN ${PortForwardPanel._esc(wan)}</span>`).appendTo(map);
            jQuery('<span class="ffr-fw-arrow">→</span>').appendTo(map);
            jQuery('<span class="ffr-fw-router">Router</span>').appendTo(map);
        } else {
            const port = (rule.target_port ?? 0) > 0 ? rule.target_port : rule.wan_port;
            const host = rule.target_host ?? '';
            const dst = host.includes(':') ? `[${host}]:${port}` : `${host}:${port}`;
            jQuery(`<span>WAN ${PortForwardPanel._esc(wan)}</span>`).appendTo(map);
            jQuery('<span class="ffr-fw-arrow">→</span>').appendTo(map);
            jQuery(`<span class="ffr-fw-dst">${PortForwardPanel._esc(dst)}</span>`).appendTo(map);
        }

        const tags = jQuery('<div class="ffr-fw-tags"></div>').appendTo(map);
        jQuery(`<span class="ffr-badge proto">${PortForwardPanel._esc(rule.proto)}</span>`).appendTo(tags);

        // A router pinhole is dual-stack, so the family is meaningless — only host DNATs
        // carry a family badge.
        if (rule.target_type === 'host') {
            jQuery(PortForwardPanel._familyBadge(rule.family)).appendTo(tags);
        }

        if (rule.description) {
            jQuery(`<div class="ffr-fw-desc">${PortForwardPanel._esc(rule.description)}</div>`).appendTo(row);
        }

        const menuWrap = jQuery('<div class="ffr-fw-menu"></div>').appendTo(row);
        const menu = new ButtonMenu(menuWrap[0] as unknown as HTMLElement, IconFa.bars, true, ButtonType.borderless);
        menu.addMenuItem('Edit rule', () => actions.onEdit(rule), IconFa.edit);
        menu.addDivider();
        menu.addMenuItem('Delete', () => actions.onDelete(rule), IconFa.trash);
    }

    /**
     * The WAN port label (`:8080`, or `:8080-8090` for a range).
     * @param rule - the rule
     * @protected
     */
    protected static _wanLabel(rule: PortForwardEntry): string {
        return (rule.wan_port_end ?? 0) > rule.wan_port
            ? `:${rule.wan_port}-${rule.wan_port_end}`
            : `:${rule.wan_port}`;
    }

    /**
     * A coloured family badge (v4 / v6). A host DNAT is always one family.
     * @param family - the family
     * @protected
     */
    protected static _familyBadge(family: string): string {
        return family === 'ipv6'
            ? '<span class="ffr-badge v6">IPv6</span>'
            : '<span class="ffr-badge v4">IPv4</span>';
    }

    /**
     * Minimal HTML escape for interpolated text.
     * @param value - the raw text
     * @protected
     */
    protected static _esc(value: string): string {
        return jQuery('<div></div>').text(value).html();
    }

}
