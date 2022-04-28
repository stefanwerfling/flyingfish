import {Domain as DomainAPI} from '../Api/Domain';
import {Listen as ListenAPI, ListenData} from '../Api/Listen';
import {Badge, BadgeType, Card, ContentCol12, ContentRow, LeftNavbarLink, Table, Td, Th, Tr} from '../Bambooo';
import {BasePage} from './BasePage';
import {DomainEditModal} from './Domains/DomainEditModal';

/**
 * Domains Page
 */
export class Domains extends BasePage {

    /**
     * domain dialog
     * @protected
     */
    protected _domainDialog: DomainEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        // domain modal ------------------------------------------------------------------------------------------------

        this._domainDialog = new DomainEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Domain', () => {
            this._domainDialog.setTitle('Add new domain');
            this._domainDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm');
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol12(row1));

        card.setTitle('Domains');

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());
        // eslint-disable-next-line no-new
        new Th(trhead, 'Id');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Domain');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Source');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Destination');

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

            const domains = await DomainAPI.getDomains();

            if (domains) {
                card.setTitle(`Domains (${domains.list.length})`);

                for (const entry of domains.list) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${entry.id}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.domainname}`);

                    const sourceTd = new Td(trbody, '');

                    for (const alink of entry.links) {
                        const listen = listenMap.get(alink.listen_id);

                        if (listen) {
                            // eslint-disable-next-line no-new
                            new Badge(sourceTd, `${listen.name} (${listen.port})`,
                                listen.type === 0 ? BadgeType.warning : BadgeType.success);
                        }
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbody, '');

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