import {ListenData} from 'flyingfish_schemas';
import {Listen as ListenAPI, ListenAddressCheckType, ListenTypes} from '../Api/Listen';
import {Nginx as NginxAPI} from '../Api/Nginx';
import {Badge, BadgeType, Card, ContentCol, ContentColSize, ContentRow, DialogConfirm, ButtonType,
    ButtonMenu, IconFa, Table, Td, Th, Tr, ModalDialogType, LeftNavbarLink} from 'bambooo';
import {BasePage} from './BasePage';
import {ListensEditModal} from './Listens/ListensEditModal';

/**
 * Listens
 */
export class Listens extends BasePage {

    /**
     * name
     * @protected
     */
    protected _name: string = 'listens';

    /**
     * listen dialog
     * @protected
     */
    protected _listenDialog: ListensEditModal;

    /**
     * toast
     * @protected
     */
    protected _toast: any;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Listens');

        // route modal -------------------------------------------------------------------------------------------------

        this._listenDialog = new ListensEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Listens', () => {
            this._listenDialog.resetValues();
            this._listenDialog.setTitle('Listen Add');
            this._listenDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        this._wrapper.getNavbar().getLeftNavbar().getElement().append('&nbsp;');

        // -------------------------------------------------------------------------------------------------------------

        this._listenDialog.setOnSave(async(): Promise<void> => {
            let tid = this._listenDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const listen: ListenData = {
                    id: tid,
                    name: this._listenDialog.getName(),
                    type: parseInt(this._listenDialog.getType(), 10),
                    port: parseInt(this._listenDialog.getPort(), 10),
                    protocol: parseInt(this._listenDialog.getProtocol(), 10),
                    description: this._listenDialog.getDescription(),
                    routeless: false,
                    enable_ipv6: this._listenDialog.getIp6(),
                    check_address: this._listenDialog.getAddressCheck(),
                    check_address_type: this._listenDialog.getAddressCheckType(),
                    disable: this._listenDialog.getDisable(),
                    proxy_protocol: this._listenDialog.getProxyProtocol(),
                    proxy_protocol_in: this._listenDialog.getProxyProtocolIn()
                };

                if (await ListenAPI.saveListen(listen)) {
                    this._listenDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Listen save success.'
                    });

                    if (await NginxAPI.reload()) {
                        this._toast.fire({
                            icon: 'success',
                            title: 'Nginx server reload config success.'
                        });
                    } else {
                        this._toast.fire({
                            icon: 'error',
                            title: 'Nginx server reload config faild, please check your last settings!'
                        });
                    }
                }
            } catch (message) {
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
        const card = new Card(new ContentCol(row1, ContentColSize.col12));

        card.setTitle('Listens');

        const table = new Table(card);
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Id');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Port');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Type');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Name');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Description');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Options');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Disable');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Action');

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();
            table.getTbody().empty();

            const listens = await ListenAPI.getListens();

            if (listens) {
                card.setTitle(`Listens (${listens.list.length})`);

                for (const entry of listens.list) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${entry.id}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.port}`);

                    const typeTd = new Td(trbody, '');
                    const typeDiv = jQuery('<div/>').appendTo(typeTd.getElement());

                    if (entry.type === ListenTypes.stream) {
                        // eslint-disable-next-line no-new
                        new Badge(typeDiv, 'Stream', BadgeType.warning);
                    } else {
                        // eslint-disable-next-line no-new
                        new Badge(typeDiv, 'Http/Https', BadgeType.success);
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.name}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.description}`);

                    const optionTd = new Td(trbody, '');
                    optionTd.setCss({
                        'white-space': 'normal'
                    });

                    if (entry.enable_ipv6) {
                        // eslint-disable-next-line no-new
                        new Badge(optionTd, 'IP6', BadgeType.color_cream_blue);
                        optionTd.append('&nbsp;');
                    }

                    if (entry.proxy_protocol) {
                        // eslint-disable-next-line no-new
                        new Badge(optionTd, 'Proxy proctocol', BadgeType.color_cream_yellow);
                        optionTd.append('&nbsp;');
                    }

                    if (entry.proxy_protocol_in) {
                        // eslint-disable-next-line no-new
                        new Badge(optionTd, 'Proxy proctocol IN', BadgeType.color_cream_yellow);
                        optionTd.append('&nbsp;');
                    }

                    if (entry.check_address) {
                        // eslint-disable-next-line no-new
                        new Badge(
                            optionTd,
                            // eslint-disable-next-line no-negated-condition
                            `IP access - (${entry.check_address_type !== ListenAddressCheckType.white ? 'black' : 'white'})`,
                            BadgeType.color_cream_purpel
                        );
                        optionTd.append('&nbsp;');
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.disable ? 'yes' : 'no'}`);

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
                            this._listenDialog.resetValues();
                            this._listenDialog.setId(entry.id);
                            this._listenDialog.setTitle('Listen Edit');
                            this._listenDialog.setName(entry.name);
                            this._listenDialog.setType(`${entry.type}`);
                            this._listenDialog.setPort(`${entry.port}`);
                            this._listenDialog.setProtocol(`${entry.protocol}`);
                            this._listenDialog.setDescription(entry.description);
                            this._listenDialog.setIp6(entry.enable_ipv6);
                            this._listenDialog.setAddressCheck(entry.check_address);
                            this._listenDialog.setAddressCheckType(entry.check_address_type);
                            this._listenDialog.setDisable(entry.disable);
                            this._listenDialog.setProxyProtocol(entry.proxy_protocol);
                            this._listenDialog.setProxyProtocolIn(entry.proxy_protocol_in);
                            this._listenDialog.show();
                        },
                        IconFa.edit
                    );

                    if (!entry.fix) {
                        btnMenu.addDivider();

                        btnMenu.addMenuItem(
                            'Delete',
                            (): void => {
                                DialogConfirm.confirm(
                                    'dcDelete',
                                    ModalDialogType.small,
                                    'Delete Listen',
                                    `Delete this Listen "${entry.name}" Port: ${entry.port}?`,
                                    async(_, dialog) => {
                                        try {
                                            if (await ListenAPI.deleteListen(entry)) {
                                                this._toast.fire({
                                                    icon: 'success',
                                                    title: 'Listen delete success.'
                                                });

                                                if (await NginxAPI.reload()) {
                                                    this._toast.fire({
                                                        icon: 'success',
                                                        title: 'Nginx server reload config success.'
                                                    });
                                                } else {
                                                    this._toast.fire({
                                                        icon: 'error',
                                                        title: 'Nginx server reload config faild, please check your last settings!'
                                                    });
                                                }
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
                                    'Delete'
                                );
                            }, IconFa.trash
                        );
                    }
                }
            }

            card.hideLoading();
        };

        // load table
        await this._onLoadTable();
    }

}