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
import {Credential} from 'flyingfish_schemas';
import {Credential as CredentialAPI} from '../../Api/Credential';
import {UnauthorizedError} from '../../Api/Error/UnauthorizedError';
import {UtilRedirect} from '../../Utils/UtilRedirect';
import {BasePage} from '../BasePage';
import {CredentialUserEditModal} from './CredentialUserEditModal';

/**
 * Credential Users page
 */
export class CredentialUsers extends BasePage {

    /**
     * name
     * @protected
     */
    protected override _name: string = 'credential';

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
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
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
                    new Td(trbody, '');

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