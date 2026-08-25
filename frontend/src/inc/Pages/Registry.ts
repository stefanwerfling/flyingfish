import {Badge, BadgeType, Card, Circle, CircleColor, ContentCol, ContentColSize, Table, Td, Th, Tr} from 'bambooo';
import {Registry as RegistryAPI} from '../Api/Registry.js';
import {BasePage} from './BasePage.js';

/**
 * Registry (Hub) status page.
 *
 * Read-only view of the parts registered with the Hub and their health status
 * (v2 modular architecture, DNS pilot). Consumes /json/registry/parts. Once the
 * schema-rendered generic UI (Bambooo v2) lands, the parts' declared UI
 * contributions will drive real dynamic pages; for now this surfaces the
 * registry state.
 */
export class Registry extends BasePage {

    /**
     * name
     * @protected
     */
    protected override _name: string = 'registry';

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Registry');
    }

    /**
     * Map a part status to a status-circle colour.
     * @param {string} status
     * @returns {CircleColor}
     * @protected
     */
    protected _statusColor(status: string): CircleColor {
        switch (status) {
            case 'online':
                return CircleColor.green;

            case 'degraded':
                return CircleColor.yellow;

            default:
                return CircleColor.red;
        }
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();
        const card = new Card(new ContentCol(content, ContentColSize.col12));

        this._onLoadTable = async(): Promise<void> => {
            card.emptyBody();
            card.setTitle('Registered parts');

            const table = new Table(card.getElement());
            const trhead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(trhead, 'Status', '32px');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Name');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Instance');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Capabilities');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Last heartbeat');

            const response = await RegistryAPI.getParts();

            if (response.list) {
                for (const part of response.list) {
                    const trbody = new Tr(table.getTbody());

                    const tdStatus = new Td(trbody, '');

                    // eslint-disable-next-line no-new
                    new Circle(tdStatus, this._statusColor(part.status));

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${part.name}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${part.instanceId}`);

                    const tdCaps = new Td(trbody, '');

                    for (const capability of part.capabilities) {
                        // eslint-disable-next-line no-new
                        new Badge(tdCaps, capability, BadgeType.primary);
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbody, new Date(part.lastHeartbeat).toLocaleString());
                }
            }
        };

        await this._onLoadTable();
    }

}