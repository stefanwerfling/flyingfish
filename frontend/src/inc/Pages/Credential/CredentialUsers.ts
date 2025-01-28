import {
    ButtonMenu,
    ButtonType,
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    IconFa,
    LeftNavbarLink, SidebarMenuItem, SidebarMenuTree,
    Table,
    Td,
    Th,
    Tr
} from 'bambooo';
import {Credential, CredentialUser} from 'flyingfish_schemas';
import {Credential as CredentialAPI} from '../../Api/Credential.js';
import {UnauthorizedError} from '../../Api/Error/UnauthorizedError.js';
import {UtilRedirect} from '../../Utils/UtilRedirect.js';
import {BasePage} from '../BasePage.js';
import {CredentialUserEditModal} from './CredentialUserEditModal.js';

/**
 * Credential Users page
 */
export class CredentialUsers extends BasePage {

    /**
     * name
     * @protected
     */
    protected override _name: string = 'credential_user';

    /**
     * Credential
     * @protected
     */
    protected _credential: Credential;

    /**
     * Credential user dialog
     * @protected
     */
    protected _userDialog: CredentialUserEditModal;

    /**
     * constructor
     */
    public constructor(credential: Credential) {
        super();

        this._credential = credential;

        this.setTitle(`Credential User-List: ${this._credential.name}`);

        // crdential user modal ----------------------------------------------------------------------------------------

        this._userDialog = new CredentialUserEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // -------------------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Credential User', async() => {
            this._userDialog.resetValues();
            this._userDialog.setTitle('Add Credential User');
            this._userDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        // -------------------------------------------------------------------------------------------------------------

        this._userDialog.setOnSave(async(): Promise<void> => {
            let tid = this._userDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const user: CredentialUser = {
                    id: tid,
                    credential_id: this._credential.id,
                    username: this._userDialog.getUsername(),
                    password: this._userDialog.getPassword(),
                    password_repeat: this._userDialog.getPasswordRepeat(),
                    disabled: this._userDialog.isDisabled()
                };

                if (await CredentialAPI.saveUser(user)) {
                    this._userDialog.hide();

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
        // Menu Tree ---------------------------------------------------------------------------------------------------

        const menuItem = this._wrapper.getMainSidebar().getSidebar().getMenu().getMenuItem('credential');

        if (menuItem !== null) {
            menuItem.setActiv(true);

            const menuTree = new SidebarMenuTree(menuItem);

            const pmenuItem = new SidebarMenuItem(menuTree);
            pmenuItem.setActiv(true);
            pmenuItem.setTitle(`User-List: ${this._credential.name}`);
        }

        // -------------------------------------------------------------------------------------------------------------

        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));

        card.setTitle('Users');

        const table = new Table(card);
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Id');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Name');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Disabled');

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();
            table.getTbody().empty();

            try {
                const users = await CredentialAPI.getUserList(this._credential.id);

                for (const user of users) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${user.id}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${user.username}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${user.disabled ? 'yes' : 'no'}`);

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
                            this._userDialog.resetValues();
                            this._userDialog.setTitle('Edit Credential User');

                            this._userDialog.setId(user.id);
                            this._userDialog.setUsername(user.username);
                            this._userDialog.setDisabled(user.disabled);
                            this._userDialog.show();
                        },
                        IconFa.edit
                    );
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