import {Host as HostAPI} from '../Api/Host';
import {Listen as ListenAPI, ListenData} from '../Api/Listen';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {Table} from '../Bambooo/Content/Table/Table';
import {ContentCol12} from '../Bambooo/Content/ContentCol12';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {Badge, BadgeType} from '../Bambooo/Content/Badge/Badge';
import {BasePage} from './BasePage';
import {HostEditModal} from './Hosts/HostEditModal';

/**
 * Hosts Page
 */
export class Hosts extends BasePage {

    /**
     * host dialog
     * @protected
     */
    protected _hostDialog: HostEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        // host modal -------------------------------------------------------------------------------------------------

        this._hostDialog = new HostEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Host', () => {
            this._hostDialog.setTitle('Add new domain');
            this._hostDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm');
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol12(row1));

        card.setTitle('Hosts');

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Id');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Domain');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Source &#8594; Destination');

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        /**
         * onLoadList
         */
        const onLoadList = async(): Promise<void> => {
            card.showLoading();
            table.getTbody().empty();

            // listens -------------------------------------------------------------------------------------------------

            const listenMap: Map<number, ListenData> = new Map<number, ListenData>();
            const listens = await ListenAPI.getListens();

            if (listens) {
                for (const alisten of listens.list) {
                    listenMap.set(alisten.id, alisten);
                }
            }

            // domains -------------------------------------------------------------------------------------------------

            const domains = await HostAPI.getHosts();

            if (domains) {
                card.setTitle(`Domains (${domains.list.length})`);

                for (const entry of domains.list) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${entry.id}`);

                    const domainTd = new Td(trbody, '');

                    if (entry.domainname === '_') {
                        // eslint-disable-next-line no-new
                        new Badge(domainTd.getElement(), 'default', BadgeType.danger);
                    } else {
                        // eslint-disable-next-line no-new
                        new Badge(domainTd.getElement(), `${entry.domainname}`, BadgeType.secondary);
                    }

                    const sdTd = new Td(trbody, '');

                    entry.streams.forEach(value => {
                        const sdDiv = jQuery('<div/>').appendTo(sdTd.getElement());

                        const listen = listenMap.get(value.listen_id);

                        if (listen) {

                            // eslint-disable-next-line no-new
                            new Badge(sdDiv, `${listen.name} (${listen.port})`,
                                listen.type === 0 ? BadgeType.warning : BadgeType.success);
                        }

                        sdDiv.append(' &#8594; ');

                        if (value.ssh) {
                            // eslint-disable-next-line no-new
                            new Badge(sdDiv, `ssh (${value.ssh.port})`, BadgeType.primary);
                        } else {
                            let badType = BadgeType.warning;

                            if (value.destination_address === '127.0.0.1') {
                                badType = BadgeType.success;
                            }

                            // eslint-disable-next-line no-new
                            new Badge(sdDiv,
                                `${value.destination_address}:${value.destination_port} (${value.alias_name})`,
                                badType);
                        }
                    });

                    entry.https.forEach(value => {
                        const sdDiv = jQuery('<div/>').appendTo(sdTd.getElement());

                        const listen = listenMap.get(value.listen_id);

                        if (listen) {
                            // eslint-disable-next-line no-new
                            new Badge(sdDiv, `${listen.name} (${listen.port})`,
                                listen.type === 0 ? BadgeType.warning : BadgeType.success);
                        }

                        sdDiv.append(' &#8594; ');
                    });

                    // eslint-disable-next-line no-new
                    new Td(trbody, '');
                }
            }

            card.hideLoading();
        };


        // load table
        await onLoadList();
    }

}