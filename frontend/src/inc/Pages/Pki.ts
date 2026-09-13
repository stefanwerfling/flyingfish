import {Badge, BadgeType, Card, ContentCol, ContentColSize, Table, Td, Th, Tr} from 'bambooo';
import {PkiCaNodeEntry} from 'flyingfish_schemas';
import {Pki as PkiAPI} from '../Api/Pki.js';
import {BasePage} from './BasePage.js';

/**
 * PKI CA tree page.
 *
 * Read-only view of the internal certificate authority tree (v2 own-PKI epic
 * 9.4). Consumes /json/pki/tree: the self-signed Root and its purpose
 * intermediates (cluster/service/device), rendered as a tree via the
 * parent_ca_id linkage. Public fields only — no private keys leave the backend.
 */
export class Pki extends BasePage {

    /**
     * name
     * @protected
     */
    protected override _name: string = 'pki';

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('PKI');
    }

    /**
     * Append one CA node as a table row. Children are prefixed to render the
     * tree edge under their parent.
     * @param {Table} table
     * @param {PkiCaNodeEntry} node
     * @param {boolean} isChild
     * @protected
     */
    protected _addRow(table: Table, node: PkiCaNodeEntry, isChild: boolean): void {
        const trbody = new Tr(table.getTbody());

        const tdType = new Td(trbody, '');

        // eslint-disable-next-line no-new
        new Badge(tdType, node.caType, node.caType === 'root' ? BadgeType.primary : BadgeType.info);

        // eslint-disable-next-line no-new
        new Td(trbody, node.purpose === '' ? '-' : node.purpose);

        // eslint-disable-next-line no-new
        new Td(trbody, `${isChild ? '└─ ' : ''}${node.subject}`);

        // eslint-disable-next-line no-new
        new Td(trbody, node.algorithm);

        // eslint-disable-next-line no-new
        new Td(trbody, node.createdAt > 0 ? new Date(node.createdAt).toLocaleString() : '-');
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();
        const card = new Card(new ContentCol(content, ContentColSize.col12));

        card.emptyBody();
        card.setTitle('Certificate Authority tree');

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Type', '96px');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Purpose');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Subject');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Algorithm');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Created');

        const response = await PkiAPI.getTree();
        const nodes = response.list ?? [];

        // Root(s) first, then each root's intermediates directly beneath it.
        const roots = nodes.filter((node) => node.parentCaId === 0);

        for (const root of roots) {
            this._addRow(table, root, false);

            const children = nodes.filter((node) => node.parentCaId === root.id);

            for (const child of children) {
                this._addRow(table, child, true);
            }
        }
    }

}