import {Domain as DomainAPI} from '../Api/Domain';
import {Card} from '../PageComponents/Content/Card/Card';
import {ContentCol12} from '../PageComponents/Content/ContentCol12';
import {ContentRow} from '../PageComponents/Content/ContentRow';
import {Table} from '../PageComponents/Content/Table/Table';
import {Td} from '../PageComponents/Content/Table/Td';
import {Th} from '../PageComponents/Content/Table/Th';
import {Tr} from '../PageComponents/Content/Table/Tr';
import {LeftNavbarLink} from '../PageComponents/Navbar/LeftNavbarLink';
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
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add domain', () => {
            this._domainDialog.setTitle('Add new domain');
            this._domainDialog.show();
            return false;
        });
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

            const domains = await DomainAPI.getDomains();

            if (domains) {
                card.setTitle(`Domains (${domains.list.length})`);

                for (const entry of domains.list) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${entry.id}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.domainname}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, '');

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