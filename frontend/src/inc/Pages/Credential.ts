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
import {Credential as CredentialData, CredentialSchemaTypes} from 'flyingfish_schemas';
import {UnauthorizedError} from '../Api/Error/UnauthorizedError.js';
import {UtilRedirect} from '../Utils/UtilRedirect.js';
import {BasePage} from './BasePage.js';
import {Credential as CredentialAPI} from '../Api/Credential.js';
import {CredentialEditModal} from './Credential/CredentialEditModal.js';
import {CredentialUsers} from './Credential/CredentialUsers.js';

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

        // -------------------------------------------------------------------------------------------------------------

        this._credentialDialog.setOnSave(async(): Promise<void> => {
            let tid = this._credentialDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const credential: CredentialData = {
                    id: tid,
                    name: this._credentialDialog.getName(),
                    authSchemaType: this._credentialDialog.getAuthSchemaType(),
                    provider: this._credentialDialog.getProvider(),
                    settings: ''
                };

                if (await CredentialAPI.save(credential)) {
                    this._credentialDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Credential save success.'
                    });
                }
            } catch (message) {
                this._toast.fire({
                    icon: 'error',
                    title: message
                });
                console.error(message);
            }
        });
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
                const providers = await CredentialAPI.getProviderList();
                const providerList: Map<string, string> = new Map<string, string>();

                for (const provider of providers.list) {
                    providerList.set(provider.name, provider.title);
                }

                const credentialRespons = await CredentialAPI.getList();

                if (credentialRespons.list) {
                    card.setTitle(`Credentials (${credentialRespons.list.length})`);

                    for (const entry of credentialRespons.list) {
                        const trbody = new Tr(table.getTbody());

                        // eslint-disable-next-line no-new
                        new Td(trbody, `#${entry.id}`);

                        // eslint-disable-next-line no-new
                        new Td(trbody, `${entry.name}`);

                        let authSchemaStr = 'Basic';

                        if (entry.authSchemaType === CredentialSchemaTypes.Digest) {
                            authSchemaStr = 'Digest';
                        }

                        // eslint-disable-next-line no-new
                        new Td(trbody, `${authSchemaStr}`);

                        const providerName = providerList.get(entry.provider);
                        let providerNameStr = entry.provider;

                        if (providerName) {
                            providerNameStr = providerName;
                        }

                        // eslint-disable-next-line no-new
                        new Td(trbody, `${providerNameStr}`);

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

                                this._credentialDialog.setId(entry.id);
                                this._credentialDialog.setProviders(providers.list);
                                this._credentialDialog.setName(entry.name);
                                this._credentialDialog.setAuthSchemaType(`${entry.authSchemaType}`);
                                this._credentialDialog.setProvider(entry.provider);
                                this._credentialDialog.show();
                            },
                            IconFa.edit
                        );

                        btnRMenu.addDivider();

                        btnRMenu.addMenuItem(
                            'User-List',
                            async(): Promise<void> => {
                                if (this._loadPageFn) {
                                    this._loadPageFn(new CredentialUsers(entry));
                                }
                            },
                            'fas fa-solid fa-users'
                        );
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
        this._onLoadTable();
    }

}