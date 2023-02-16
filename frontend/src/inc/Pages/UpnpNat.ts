import moment from 'moment';
import {GatewayIdentifier as GatewayIdentifierAPI, GatewayIdentifierEntry} from '../Api/GatewayIdentifier';
import {Listen as ListenAPI, ListenData} from '../Api/Listen';
import {NatStatus, UpnpNat as UpnpNatAPI, UpnpNatSaveRequest} from '../Api/UpnpNat';
import {Badge, BadgeType, Card, Circle, CircleColor, ContentCol, ContentColSize, DialogConfirm, ButtonType,
    ButtonMenu, IconFa, Table, Td, Th, Tr, ModalDialogType, LeftNavbarLink} from 'bambooo';
import {BasePage} from './BasePage';
import {UpnpNatEditModal} from './UpnpNat/UpnpNatEditModal';

/**
 * UpnpNat Page
 */
export class UpnpNat extends BasePage {

    /**
     * name
     * @protected
     */
    protected _name: string = 'upnpnat';

    /**
     * upnp nat dialog
     * @protected
     */
    protected _upnpnatDialog: UpnpNatEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Upnp Nat');

        this._upnpnatDialog = new UpnpNatEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Upnp-Nat', () => {
            this._upnpnatDialog.resetValues();
            this._upnpnatDialog.setTitle('Upnp-Nat Add');
            this._upnpnatDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        // -------------------------------------------------------------------------------------------------------------

        this._upnpnatDialog.setOnSave(async(): Promise<void> => {
            let tid = this._upnpnatDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const upnpnat: UpnpNatSaveRequest = {
                    id: tid,
                    postion: 0,
                    public_port: this._upnpnatDialog.getPublicPort(),
                    gateway_identifier_id: this._upnpnatDialog.getGatewayIdentifier(),
                    gateway_address: this._upnpnatDialog.getGatewayAddress(),
                    private_port: this._upnpnatDialog.getPrivatPort(),
                    client_address: this._upnpnatDialog.getClientAddress(),
                    use_himhip_host_address: this._upnpnatDialog.getUseHostAddress(),
                    ttl: this._upnpnatDialog.getTTL(),
                    protocol: this._upnpnatDialog.getProtocol(),
                    last_ttl_update: 0,
                    listen_id: this._upnpnatDialog.getListen(),
                    description: this._upnpnatDialog.getDescription(),
                    last_update: 0,
                    last_status: 0
                };

                if (await UpnpNatAPI.save(upnpnat)) {
                    this._upnpnatDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'UpnpNat save success.'
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

            // gateway identifiers -------------------------------------------------------------------------------------

            const gatewayIdentifierMap: Map<number, GatewayIdentifierEntry> = new Map<number, GatewayIdentifierEntry>();
            const gatewayIdentifiers = await GatewayIdentifierAPI.getList();

            if (gatewayIdentifiers) {
                this._upnpnatDialog.setGatewayIdentifiers(gatewayIdentifiers);

                for (const gi of gatewayIdentifiers) {
                    gatewayIdentifierMap.set(gi.id, gi);
                }
            }

            // listens -------------------------------------------------------------------------------------------------

            const listenMap: Map<number, ListenData> = new Map<number, ListenData>();
            const listens = await ListenAPI.getListens();

            if (listens) {
                this._upnpnatDialog.setListens(listens.list);

                for (const alisten of listens.list) {
                    listenMap.set(alisten.id, alisten);
                }
            }

            // ---------------------------------------------------------------------------------------------------------

            card.setTitle('Upnp-Nat');

            const table = new Table(card.getElement());
            const trhead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(trhead, 'Status');

            // eslint-disable-next-line no-new
            new Th(trhead, 'for Gateway<br>Extern');

            // eslint-disable-next-line no-new
            new Th(trhead, '', '150px');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Intern<br>Listen');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Last update');

            // eslint-disable-next-line no-new
            new Th(trhead, 'TTL');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Description');

            // eslint-disable-next-line no-new
            new Th(trhead, '');

            const list = await UpnpNatAPI.getList();

            if (list) {
                list.forEach((upnpnat) => {
                    const trbody = new Tr(table.getTbody());
                    const statusTd = new Td(trbody, '');

                    switch (upnpnat.last_status) {
                        case NatStatus.inactive:
                            // eslint-disable-next-line no-new
                            new Circle(statusTd, CircleColor.gray);
                            break;

                        case NatStatus.ok:
                            // eslint-disable-next-line no-new
                            new Circle(statusTd, CircleColor.green);
                            break;

                        case NatStatus.error:
                            // eslint-disable-next-line no-new
                            new Circle(statusTd, CircleColor.red);
                            break;
                    }

                    const externTd = new Td(trbody, '');
                    const gatewayIdentifier = gatewayIdentifierMap.get(upnpnat.gateway_identifier_id);

                    if (gatewayIdentifier) {
                        // eslint-disable-next-line no-new
                        new Badge(
                            externTd,
                            `${gatewayIdentifier.networkname}`,
                            BadgeType.primary,
                            `${gatewayIdentifier.color}`
                        );
                    } else {
                        // eslint-disable-next-line no-new
                        new Badge(
                            externTd,
                            'Default FlyingFish',
                            BadgeType.secondary
                        );
                    }

                    externTd.append(`<br>${upnpnat.gateway_address}:${upnpnat.public_port}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, ' &#8594; ');

                    const internTd = new Td(trbody, '');
                    if (upnpnat.listen_id === 0) {
                        let addressStr = upnpnat.client_address;

                        if (upnpnat.use_himhip_host_address) {
                            addressStr = '(DHCP IP)';
                        }

                        internTd.append(`${addressStr}:${upnpnat.private_port}`);
                    } else {
                        let addressStr = upnpnat.client_address;

                        if (upnpnat.use_himhip_host_address) {
                            addressStr = '(DHCP IP)';
                        }

                        internTd.append(`${addressStr}`);
                    }

                    internTd.append('<br>');

                    const listen = listenMap.get(upnpnat.listen_id);

                    if (listen) {
                        // eslint-disable-next-line no-new
                        new Badge(internTd, `${listen.name} (${listen.port})`,
                            listen.type === 0 ? BadgeType.warning : BadgeType.success);
                    }

                    const date = moment(upnpnat.last_update * 1000);

                    // eslint-disable-next-line no-new
                    new Td(trbody, date.format('<b>YYYY-MM-DD</b> HH:mm:ss'));

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${upnpnat.ttl}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${upnpnat.description}`);

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
                            this._upnpnatDialog.resetValues();
                            this._upnpnatDialog.setTitle('Upnp-Nat Edit');
                            this._upnpnatDialog.show();
                            this._upnpnatDialog.setId(upnpnat.id);
                            this._upnpnatDialog.setGatewayIdentifier(upnpnat.gateway_identifier_id);
                            this._upnpnatDialog.setGatewayAddress(upnpnat.gateway_address);
                            this._upnpnatDialog.setPublicPort(upnpnat.public_port);
                            this._upnpnatDialog.setClientAddress(upnpnat.client_address);
                            this._upnpnatDialog.setUseHostAddress(upnpnat.use_himhip_host_address);
                            this._upnpnatDialog.setPrivatPort(upnpnat.private_port);
                            this._upnpnatDialog.setListen(`${upnpnat.listen_id}`);
                            this._upnpnatDialog.setTTL(upnpnat.ttl);
                            this._upnpnatDialog.setProtocol(upnpnat.protocol);
                            this._upnpnatDialog.setDescription(upnpnat.description);
                        },
                        IconFa.edit
                    );

                    btnMenu.addDivider();

                    btnMenu.addMenuItem(
                        'Delete',
                        (): void => {
                            DialogConfirm.confirm(
                                'upnpDelete',
                                ModalDialogType.large,
                                'Delete Upnp-Nat',
                                `Delete this Upnp-Nat "${upnpnat.gateway_address}:${upnpnat.public_port}"?`,
                                async(_, dialog) => {
                                    try {
                                        if (await UpnpNatAPI.delete(upnpnat.id)) {
                                            this._toast.fire({
                                                icon: 'success',
                                                title: 'Upnp-Nat delete success.'
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
                                'Delete'
                            );
                        },
                        IconFa.trash
                    );
                });
            }
        };

        // load table
        await this._onLoadTable();
    }

}