import {Listen as ListenAPI, ListenData} from '../Api/Listen';
import {Nginx as NginxAPI} from '../Api/Nginx';
import {Route as RouteAPI, RouteStreamSave} from '../Api/Route';
import {Badge, BadgeType} from '../Bambooo/Content/Badge/Badge';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol12} from '../Bambooo/Content/ContentCol12';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {ButtonMenu} from '../Bambooo/Content/Form/ButtonMenu';
import {IconFa} from '../Bambooo/Content/Icon/Icon';
import {Table} from '../Bambooo/Content/Table/Table';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {BasePage} from './BasePage';
import {
    RouteStreamEditModal,
    RouteStreamEditModalDesType,
    RouteStreamEditModalSshType
} from './Routes/RouteStreamEditModal';

/**
 * Hosts Page
 */
export class Routes extends BasePage {

    /**
     * toast
     * @protected
     */
    protected _toast: any;

    /**
     * route stream dialog
     * @protected
     */
    protected _routeStreamDialog: RouteStreamEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        // route modal -------------------------------------------------------------------------------------------------

        this._routeStreamDialog = new RouteStreamEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Reload Config', async() => {
            // @ts-ignore
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });

            if (await NginxAPI.reload()) {
                Toast.fire({
                    icon: 'success',
                    title: 'Nginx server reload config success.'
                });
            } else {
                Toast.fire({
                    icon: 'error',
                    title: 'Nginx server reload config faild.'
                });
            }

            return false;
        }, 'btn btn-block btn-default btn-sm');

        // @ts-ignore
        this._toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });

        // -------------------------------------------------------------------------------------------------------------

        this._routeStreamDialog.setOnSave(async(): Promise<void> => {
            let tid = this._routeStreamDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const stream: RouteStreamSave = {
                    domainid: this._routeStreamDialog.getDomainId(),
                    stream: {
                        id: tid,
                        isdefault: false,
                        alias_name: this._routeStreamDialog.getAliasName(),
                        index: this._routeStreamDialog.getIndex(),
                        listen_id: this._routeStreamDialog.getListen(),
                        destination_listen_id: 0,
                        ssh: {
                        },
                        upstreams: []
                    }
                };

                switch (this._routeStreamDialog.getDestinatonType()) {
                    case RouteStreamEditModalDesType.listen:
                        stream.stream.destination_listen_id = this._routeStreamDialog.getDestinationListen();
                        break;

                    case RouteStreamEditModalDesType.upstream:
                        stream.stream.upstreams = this._routeStreamDialog.getUpstreamList();
                        break;

                    case RouteStreamEditModalDesType.ssh:
                        switch (this._routeStreamDialog.getSshType()) {
                            case RouteStreamEditModalSshType.in:
                                stream.stream.ssh.in = {
                                    id: this._routeStreamDialog.getSshPortId(),
                                    port: this._routeStreamDialog.getSshPort(),
                                    username: this._routeStreamDialog.getSshUsername(),
                                    password: this._routeStreamDialog.getSshPassword(),
                                    user_id: this._routeStreamDialog.getSshUserId()
                                };
                                break;

                            case RouteStreamEditModalSshType.out:
                                stream.stream.ssh.out = {
                                    id: parseInt(this._routeStreamDialog.getSshListen(), 10),
                                    port: 0
                                };
                                break;
                        }
                        break;
                }

                if (await RouteAPI.saveRouteStream(stream)) {
                    this._routeStreamDialog.hide();

                    this._toast.fire({
                        icon: 'success',
                        title: 'Stream save success.'
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
        });
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {

        /**
         * onLoadList
         */
        const onLoadList = async(): Promise<void> => {

            // listens -------------------------------------------------------------------------------------------------

            const listenMap: Map<number, ListenData> = new Map<number, ListenData>();
            const listens = await ListenAPI.getListens();

            if (listens) {
                this._routeStreamDialog.setListens(listens.list);

                for (const alisten of listens.list) {
                    listenMap.set(alisten.id, alisten);
                }
            }

            // routes --------------------------------------------------------------------------------------------------

            const routes = await RouteAPI.getRoutes();

            if (routes) {
                const dnsserverport = routes.defaults?.dnsserverport || 5333;

                for (const entry of routes.list) {
                    const row = new ContentRow(this._wrapper.getContentWrapper().getContent());
                    const card = new Card(new ContentCol12(row));

                    jQuery('<span>Routes for Domain:&nbsp;</span>').appendTo(card.getTitleElement());

                    card.showLoading();

                    if (entry.domainfix) {
                        // eslint-disable-next-line no-new
                        new Badge(card.getTitleElement(), 'default', BadgeType.danger);
                    } else {
                        // eslint-disable-next-line no-new
                        new Badge(card.getTitleElement(), `${entry.domainname}`, BadgeType.secondary);
                    }

                    if (!entry.domainfix) {
                        const btnMenu = new ButtonMenu(card.getToolsElement(), IconFa.bars, true);

                        btnMenu.addMenuItem(
                            'Add Stream Route',
                            (): void => {
                                this._routeStreamDialog.resetValues();
                                this._routeStreamDialog.setTitle('Add Stream Route')
                                this._routeStreamDialog.show();
                                this._routeStreamDialog.setDomainName(entry.domainname);
                                this._routeStreamDialog.setDomainId(entry.id);
                            },
                            IconFa.add);

                        btnMenu.addMenuItem(
                            'Add Http/Https Route',
                            (): void => {

                            },
                            IconFa.add);
                    }



                    // table -------------------------------------------------------------------------------------------

                    const table = new Table(card.getElement());
                    const trhead = new Tr(table.getThead());

                    // eslint-disable-next-line no-new
                    new Th(trhead, 'Source', '150px');

                    // eslint-disable-next-line no-new
                    new Th(trhead, ' &#8594; ', '20px');

                    // eslint-disable-next-line no-new
                    new Th(trhead, 'Destination', '150px');

                    // eslint-disable-next-line no-new
                    new Th(trhead, '');

                    // -------------------------------------------------------------------------------------------------

                    entry.streams.forEach(value => {
                        const trbody = new Tr(table.getTbody());
                        const sdTd = new Td(trbody, '');

                        const listen = listenMap.get(value.listen_id);

                        if (listen) {
                            // eslint-disable-next-line no-new
                            new Badge(sdTd.getElement(), `${listen.name} (${listen.port})`,
                                listen.type === 0 ? BadgeType.warning : BadgeType.success);
                        }

                        // eslint-disable-next-line no-new
                        new Td(trbody, ' &#8594; ');

                        const sdTdD = new Td(trbody, '');

                        if (value.destination_listen_id > 0) {
                            const dlisten = listenMap.get(value.destination_listen_id);

                            if (dlisten) {
                                // eslint-disable-next-line no-new
                                new Badge(sdTdD.getElement(),
                                    `${dlisten.name} (${dlisten.port})`, BadgeType.success
                                );
                            } else {
                                // eslint-disable-next-line no-new
                                new Badge(sdTdD.getElement(),
                                    `destination listen not found! `, BadgeType.danger
                                );
                            }
                        } else if (value.ssh.in) {
                            // eslint-disable-next-line no-new
                            new Badge(sdTdD.getElement(), `SSH INTERNT IN (--> ${value.ssh.in.port})`, BadgeType.primary);
                        } else if(value.ssh.out) {
                            // eslint-disable-next-line no-new
                            new Badge(sdTdD.getElement(), `SSH INTERNT OUT (<-- ${value.ssh.out.port})`, BadgeType.primary);
                        } else {
                            if (value.upstreams.length === 0) {
                                sdTdD.addValue('None');
                            } else {
                                const firstUpstream = value.upstreams[0];

                                let badType = BadgeType.warning;

                                if (firstUpstream.address === '127.0.0.1') {
                                    badType = BadgeType.success;
                                }

                                if (firstUpstream.port === dnsserverport) {
                                    badType = BadgeType.color_cream_purpel;
                                }

                                let andMore = '';

                                if (value.upstreams.length>1) {
                                    andMore = ', ...';
                                }

                                // eslint-disable-next-line no-new
                                new Badge(sdTdD.getElement(),
                                    `${firstUpstream.address}:${firstUpstream.port}${andMore} (${value.alias_name})`,
                                    badType);
                            }
                        }

                        const tdAction = new Td(trbody, '');
                        const btnMenu = new ButtonMenu(tdAction.getElement(), IconFa.bars, true);

                        btnMenu.addMenuItem(
                            'Edit',
                            (): void => {
                                this._routeStreamDialog.resetValues();
                                this._routeStreamDialog.setTitle('Edit Stream Route');
                                this._routeStreamDialog.show();
                                this._routeStreamDialog.setId(value.id);
                                this._routeStreamDialog.setDomainName(entry.domainname);
                                this._routeStreamDialog.setDomainId(entry.id);
                                this._routeStreamDialog.setListen(`${value.listen_id}`);
                                this._routeStreamDialog.setAliasName(value.alias_name);

                                if (value.index > 0) {
                                    this._routeStreamDialog.setIndex(value.index);
                                }

                                if (value.ssh.in || value.ssh.out) {
                                    this._routeStreamDialog.setDestinationType(RouteStreamEditModalDesType.ssh);

                                    if (value.ssh.in) {
                                        this._routeStreamDialog.setSshType(RouteStreamEditModalSshType.in);
                                        this._routeStreamDialog.setSshPortId(value.ssh.in.id);

                                        if (value.ssh.in.port > 0) {
                                            this._routeStreamDialog.setSshPort(value.ssh.in.port);
                                        }

                                        this._routeStreamDialog.setSshUserId(value.ssh.in.user_id);
                                        this._routeStreamDialog.setSshUsername(value.ssh.in.username);
                                    } else if (value.ssh.out) {
                                        this._routeStreamDialog.setSshType(RouteStreamEditModalSshType.out);
                                    } else {
                                        this._routeStreamDialog.setSshType(RouteStreamEditModalSshType.none);
                                    }
                                } else if ( value.destination_listen_id > 0) {
                                    this._routeStreamDialog.setDestinationType(RouteStreamEditModalDesType.listen);
                                    this._routeStreamDialog.setDestinationListen(value.destination_listen_id);
                                } else {
                                    this._routeStreamDialog.setDestinationType(RouteStreamEditModalDesType.upstream);
                                    this._routeStreamDialog.setUpstreamList(value.upstreams);
                                }
                            },
                            IconFa.edit);

                        if (!value.isdefault) {
                            btnMenu.addDivider();

                            btnMenu.addMenuItem(
                                'Delete',
                                (): void => {

                                },
                                IconFa.trash
                            );
                        }
                    });

                    entry.https.forEach(value => {
                        const trbody = new Tr(table.getTbody());
                        const sdTd = new Td(trbody, '');

                        const listen = listenMap.get(value.listen_id);

                        if (listen) {
                            // eslint-disable-next-line no-new
                            new Badge(sdTd.getElement(), `${listen.name} (${listen.port})`,
                                listen.type === 0 ? BadgeType.warning : BadgeType.success
                            );
                        }

                        // eslint-disable-next-line no-new
                        new Td(trbody, ' &#8594; ');

                        const sdTdD = new Td(trbody, '');

                        if (value.locations.length > 0) {
                            const aLocation = value.locations[0];

                            if (aLocation.ssh.port_out) {
                                // eslint-disable-next-line no-new
                                new Badge(sdTdD.getElement(), `SSH INTERNT OUT (<-- ${aLocation.ssh.port_out})`, BadgeType.primary);
                            } else {
                                // eslint-disable-next-line no-new
                                new Badge(sdTdD.getElement(), aLocation.proxy_pass, BadgeType.info);
                            }
                        } else {
                            sdTdD.addValue('None');
                        }

                        const tdAction = new Td(trbody, '');
                        const btnMenu = new ButtonMenu(tdAction.getElement(), IconFa.bars, true);

                        btnMenu.addMenuItem(
                            'Edit',
                            (): void => {

                            },
                            IconFa.edit);

                        btnMenu.addDivider();

                        btnMenu.addMenuItem(
                            'Delete',
                            (): void => {

                            },
                            IconFa.trash);
                    });

                    card.hideLoading();
                }
            }
        };


        // load table
        await onLoadList();
    }

}