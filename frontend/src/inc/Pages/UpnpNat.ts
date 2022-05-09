import {UpnpNat as UpnpNatAPI} from '../Api/UpnpNat';
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
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol12(row1));

        card.setTitle('Upnp Nat');

        const list = UpnpNatAPI.getList();

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Gateway');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Public Port');
        console.log(list);
    }

}