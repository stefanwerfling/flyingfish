import {UpnpNat as UpnpNatAPI} from '../Api/UpnpNat';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {Table} from '../Bambooo/Content/Table/Table';
import {ContentCol12} from '../Bambooo/Content/ContentCol12';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {BasePage} from './BasePage';

/**
 * UpnpNat Page
 */
export class UpnpNat extends BasePage {

    /**
     * name
     * @protected
     */
    protected _name: string = 'upnpnat';

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Upnp Nat');
    }

    /**
     * loadContent
     * https://npm.io/package/@network-utils/arp-lookup
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());

        const list = await UpnpNatAPI.getList();

        list?.forEach((device) => {
            const card = new Card(new ContentCol12(row1));

            card.setTitle('Upnp Nat Device');

            const table = new Table(card.getElement());
            const trhead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(trhead, 'Gateway');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Public');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Private');

            // eslint-disable-next-line no-new
            new Th(trhead, 'TTL');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Description');

            device.mappings.forEach((map) => {
                const trbody = new Tr(table.getTbody());

                // eslint-disable-next-line no-new
                new Td(trbody, `${map.public.gateway}`);

                // eslint-disable-next-line no-new
                new Td(trbody, `${map.public.host}:${map.public.port}`);

                // eslint-disable-next-line no-new
                new Td(trbody, `${map.private.host}:${map.private.port}`);

                // eslint-disable-next-line no-new
                new Td(trbody, `${map.ttl}`);

                // eslint-disable-next-line no-new
                new Td(trbody, `${map.description}`);
            });
        });
    }

}