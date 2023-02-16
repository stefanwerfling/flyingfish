import {User as UserAPI, UserEntry} from '../Api/User';
import {ButtonClass, Card, ContentCol, ContentColSize, DialogConfirm, ButtonType, ButtonMenu, IconFa, Table,
    Td, Th, Tr, ModalDialogType, LeftNavbarLink} from 'bambooo';
import {BasePage} from './BasePage';
import {UsersEditModal} from './Users/UsersEditModal';

/**
 * Users
 */
export class Users extends BasePage {

    /**
     * name
     * @protected
     */
    protected _name: string = 'users';

    /**
     * user dialog
     * @protected
     */
    protected _userDialog: UsersEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Users');

        this._userDialog = new UsersEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add User', () => {
            this._userDialog.resetValues();
            this._userDialog.setTitle('User add');
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
                const entry: UserEntry = {
                    id: tid,
                    username: this._userDialog.getUsername(),
                    email: this._userDialog.getEMail(),
                    disable: this._userDialog.getDisable()
                };

                const password = this._userDialog.getPassword();
                const passwordRepeat = this._userDialog.getPasswordRepeat();

                if (password !== '') {
                    entry.password = password;
                    entry.password_repeat = passwordRepeat;
                }

                if (await UserAPI.saveUser(entry)) {
                    this._userDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'User save success.'
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
        const content = this._wrapper.getContentWrapper().getContent();
        const card = new Card(new ContentCol(content, ContentColSize.col12));

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            card.emptyBody();

            // ---------------------------------------------------------------------------------------------------------

            card.setTitle('User list');

            const table = new Table(card.getElement());
            const trhead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(trhead, 'ID');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Username');

            // eslint-disable-next-line no-new
            new Th(trhead, 'EMail');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Disabled');

            // eslint-disable-next-line no-new
            new Th(trhead, '');

            const userlist = await UserAPI.getUserList();

            if (userlist) {
                for (const aUser of userlist) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${aUser.id}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${aUser.username}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${aUser.email}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${aUser.disable ? 'Yes' : 'No'}`);

                    const tdAction = new Td(trbody, '');

                    const btnMenu = new ButtonMenu(
                        tdAction,
                        IconFa.bars,
                        true,
                        ButtonType.borderless
                    );

                    btnMenu.addMenuItem(
                        'Edit',
                        async(): Promise<void> => {
                            this._userDialog.resetValues();
                            this._userDialog.setTitle('User edit');
                            this._userDialog.show();

                            this._userDialog.setId(aUser.id);
                            this._userDialog.setUsername(aUser.username);
                            this._userDialog.setEMail(aUser.email);
                            this._userDialog.setDisable(aUser.disable);
                        },
                        IconFa.edit
                    );

                    btnMenu.addDivider();

                    btnMenu.addMenuItem(
                        'Delete',
                        (): void => {
                            DialogConfirm.confirm(
                                'userDelete',
                                ModalDialogType.large,
                                'Delete User',
                                'Are you sure you want to delete the user?',
                                async(_, dialog) => {
                                    try {
                                        if (await UserAPI.deleteUser({id: aUser.id})) {
                                            this._toast.fire({
                                                icon: 'success',
                                                title: 'User delete success.'
                                            });
                                        }
                                    } catch ({message}) {
                                        this._toast.fire({
                                            icon: 'error',
                                            title: message
                                        });
                                    }

                                    dialog.hide();

                                    if (this._onLoadTable) {
                                        this._onLoadTable();
                                    }
                                },
                                undefined,
                                'Delete',
                                ButtonClass.danger
                            );
                        },
                        IconFa.trash
                    );
                }
            }
        };

        // load table
        await this._onLoadTable();
    }

}