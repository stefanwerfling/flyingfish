import moment from 'moment';
import {Domain} from '../Api/Domain';
import {DynDnsClient as DynDnsClientAPI, DynDnsClientData} from '../Api/DynDnsClient';
import {Badge, BadgeType} from '../Bambooo/Content/Badge/Badge';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol12} from '../Bambooo/Content/ContentCol12';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {ButtonType} from '../Bambooo/Content/Form/Button';
import {ButtonMenu} from '../Bambooo/Content/Form/ButtonMenu';
import {IconFa} from '../Bambooo/Content/Icon/Icon';
import {Table} from '../Bambooo/Content/Table/Table';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {BasePage} from './BasePage';
import {DynDnsClientEditModal} from './DynDnsClient/DynDnsClientEditModal';

/**
 * DynDnsClients Page
 */
export class DynDnsClients extends BasePage {

    /**
     * name
     * @protected
     */
    protected _name: string = 'dyndnsclients';

    /**
     * dyn dns client dialog
     * @protected
     */
    protected _dynDnsClientDialog: DynDnsClientEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('DynDns Clients');

        // dyndnsclient modal ------------------------------------------------------------------------------------------

        this._dynDnsClientDialog = new DynDnsClientEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // -------------------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Client', async() => {
            this._dynDnsClientDialog.resetValues();
            this._dynDnsClientDialog.setTitle('DynDns Client Add');
            this._dynDnsClientDialog.show();

            const providers = await DynDnsClientAPI.getProviderList();

            if (providers) {
                this._dynDnsClientDialog.setProviders(providers.list);
            }

            const domains = await Domain.getDomains();

            if (domains) {
                this._dynDnsClientDialog.setDomains(domains.list);
            }

            return false;
        }, 'btn btn-block btn-default btn-sm');

        this._wrapper.getNavbar().getLeftNavbar().getElement().append('&nbsp;');

        // -------------------------------------------------------------------------------------------------------------

        this._dynDnsClientDialog.setOnSave(async(): Promise<void> => {
            let tid = this._dynDnsClientDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const client: DynDnsClientData = {
                    id: tid,
                    provider: {
                        name: this._dynDnsClientDialog.getProvider(),
                        title: ''
                    },
                    domains: this._dynDnsClientDialog.getDomainSelected(),
                    username: this._dynDnsClientDialog.getUsername(),
                    password: this._dynDnsClientDialog.getPassword(),
                    update_domain: this._dynDnsClientDialog.getUpdateDomains(),
                    last_status: 0,
                    last_status_msg: '',
                    last_update: 0
                };

                if (await DynDnsClientAPI.saveClient(client)) {
                    this._dynDnsClientDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'DynDns client save success.'
                    });
                }
            } catch ({message}) {
                this._toast.fire({
                    icon: 'error',
                    title: message
                });
            }
        });
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());

        const card = new Card(new ContentCol12(row1));

        card.setTitle('Listens');

        const table = new Table(card);
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Id');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Domains');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Provider');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Username');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Last-Status');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Last-Update');

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();
            table.getTbody().empty();

            const clients = await DynDnsClientAPI.getClients();

            if (clients) {
                card.setTitle(`DynDns Clients (${clients.list.length})`);

                for (const entry of clients.list) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${entry.id}`);

                    const domainsTd = new Td(trbody, '');

                    for (const domain of entry.domains) {
                        new Badge(domainsTd, `${domain.name}`, BadgeType.secondary);
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.provider.title}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.username}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `(${entry.last_status}) ${entry.last_status_msg}`);

                    const date = moment(entry.last_update * 1000);

                    // eslint-disable-next-line no-new
                    new Td(trbody, date.format('<b>YYYY-MM-DD</b> HH:mm:ss'));

                    const tdRAction = new Td(trbody, '');
                    const btnRMenu = new ButtonMenu(
                        tdRAction.getElement(),
                        IconFa.bars,
                        true,
                        ButtonType.borderless
                    );

                    btnRMenu.addMenuItem(
                        'Edit',
                        async(): Promise<void> => {
                            this._dynDnsClientDialog.resetValues();
                            this._dynDnsClientDialog.setTitle('DynDns Client Edit');
                            this._dynDnsClientDialog.show();

                            const providers = await DynDnsClientAPI.getProviderList();

                            if (providers) {
                                this._dynDnsClientDialog.setProviders(providers.list);
                            }

                            const domains = await Domain.getDomains();

                            if (domains) {
                                this._dynDnsClientDialog.setDomains(domains.list);
                            }

                            this._dynDnsClientDialog.setId(entry.id);
                            this._dynDnsClientDialog.setProvider(entry.provider.name);
                            this._dynDnsClientDialog.setDomainSelected(entry.domains);
                            this._dynDnsClientDialog.setUsername(entry.username);
                            this._dynDnsClientDialog.setUpdateDomains(entry.update_domain);
                        },
                        IconFa.edit);

                    btnRMenu.addDivider();

                    btnRMenu.addMenuItem(
                        'Delete',
                        (): void => {

                        },
                        IconFa.trash);
                }
            }

            card.hideLoading();
        };

        // load table
        await this._onLoadTable();
    }

}