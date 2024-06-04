import {
    ButtonMenu,
    ButtonType,
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    IconFa,
    LeftNavbarLink,
    Table,
    Td,
    Th,
    Tr
} from 'bambooo';
import {UnauthorizedError} from '../Api/Error/UnauthorizedError';
import {UtilRedirect} from '../Utils/UtilRedirect';
import {BasePage} from './BasePage';
import {Credential as CredentialAPI} from '../Api/Credential';
import {CredentialEditModal} from './Credential/CredentialEditModal';

/**
 * Credential Page
 */
export class Credential extends BasePage {

    /**
     * name
     * @protected
     */
    protected override _name: string = 'credential';

    /**
     * credential dialog
     * @protected
     */
    protected _credentialDialog: CredentialEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Credential');

        // crendential modal -------------------------------------------------------------------------------------------

        this._credentialDialog = new CredentialEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // -------------------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Credential', async() => {
            this._credentialDialog.resetValues();
            this._credentialDialog.setTitle('Credential Add');
            this._credentialDialog.show();

            const providers = await CredentialAPI.getProviderList();

            this._credentialDialog.setProviders(providers.list);

            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());

        const card = new Card(new ContentCol(row1, ContentColSize.col12));

        card.setTitle('Credential');

        const table = new Table(card);
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Id');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Name');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Auth Schema');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Provider');

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();
            table.getTbody().empty();

            try {
                const credentialRespons = await CredentialAPI.getList();

                if (credentialRespons.list) {
                    card.setTitle(`Credentials (${credentialRespons.list.length})`);

                    for (const entry of credentialRespons.list) {
                        const trbody = new Tr(table.getTbody());

                        // eslint-disable-next-line no-new
                        new Td(trbody, `#${entry.id}`);

                        // eslint-disable-next-line no-new
                        new Td(trbody, `${entry.name}`);

                        // eslint-disable-next-line no-new
                        new Td(trbody, `${entry.authSchemaType}`);

                        // eslint-disable-next-line no-new
                        new Td(trbody, `${entry.provider}`);

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
                                this._credentialDialog.resetValues();
                                this._credentialDialog.setTitle('Credential Edit');

                                const providers = await CredentialAPI.getProviderList();

                                this._credentialDialog.setProviders(providers.list);
                            },
                            IconFa.edit
                        );

                        btnRMenu.addDivider();
                    }
                }
            } catch (error) {
                if (error instanceof UnauthorizedError) {
                    UtilRedirect.toLogin();
                }
            }

            card.hideLoading();
        };

        // load table
        await this._onLoadTable();
    }

}