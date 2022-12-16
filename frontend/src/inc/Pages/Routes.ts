import {Listen as ListenAPI, ListenData} from '../Api/Listen';
import {Nginx as NginxAPI} from '../Api/Nginx';
import {
    NginxStreamDestinationType,
    NginxStreamSshR,
    Route as RouteAPI,
    RouteHttpSave,
    RouteStreamSave,
    UpstreamLoadBalancingAlgorithm
} from '../Api/Route';
import {Ssh as SshAPI} from '../Api/Ssh';
import {Ssl as SslAPI} from '../Api/Ssl';
import {Badge, BadgeType} from '../Bambooo/Content/Badge/Badge';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol, ContentColSize} from '../Bambooo/Content/ContentCol';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {DialogConfirm} from '../Bambooo/Content/Dialog/DialogConfirm';
import {ButtonType} from '../Bambooo/Content/Form/Button';
import {ButtonMenu} from '../Bambooo/Content/Form/ButtonMenu';
import {Icon, IconFa} from '../Bambooo/Content/Icon/Icon';
import {Table} from '../Bambooo/Content/Table/Table';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {Tooltip} from '../Bambooo/Content/Tooltip/Tooltip';
import {ModalDialogType} from '../Bambooo/Modal/ModalDialog';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {BasePage} from './BasePage';
import {RouteHttpEditModal} from './Routes/RouteHttpEditModal';
import {RouteStreamEditModal} from './Routes/RouteStreamEditModal';

/**
 * Hosts Page
 */
export class Routes extends BasePage {

    /**
     * name
     * @protected
     */
    protected _name: string = 'routes';

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
     * route http dialog
     * @protected
     */
    protected _routeHttpDialog: RouteHttpEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Routes');

        // route modal -------------------------------------------------------------------------------------------------

        this._routeStreamDialog = new RouteStreamEditModal(
            this._wrapper.getContentWrapper().getElement()
        );

        this._routeHttpDialog = new RouteHttpEditModal(
            this._wrapper.getContentWrapper().getElement()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        const toast = this._toast;

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Reload Config', async() => {
            if (await NginxAPI.reload()) {
                toast.fire({
                    icon: 'success',
                    title: 'Nginx server reload config success.'
                });
            } else {
                toast.fire({
                    icon: 'error',
                    title: 'Nginx server reload config faild.'
                });
            }

            return false;
        }, 'btn btn-block btn-default btn-sm');

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
                        destination_type: this._routeStreamDialog.getDestinatonType(),
                        ssh_r_type: NginxStreamSshR.none,
                        load_balancing_algorithm: UpstreamLoadBalancingAlgorithm.none,
                        upstreams: []
                    }
                };

                switch (this._routeStreamDialog.getDestinatonType()) {
                    case NginxStreamDestinationType.listen:
                        stream.stream.destination_listen_id = this._routeStreamDialog.getDestinationListen();
                        break;

                    case NginxStreamDestinationType.upstream:
                        stream.stream.upstreams = this._routeStreamDialog.getUpstreamList();
                        break;

                    case NginxStreamDestinationType.ssh_r:
                        switch (this._routeStreamDialog.getSshRType()) {
                            case NginxStreamSshR.in:
                                stream.stream.ssh = {
                                    id: this._routeStreamDialog.getSshPortId(),
                                    port: this._routeStreamDialog.getSshPort(),
                                    username: this._routeStreamDialog.getSshUsername(),
                                    password: this._routeStreamDialog.getSshPassword(),
                                    user_id: this._routeStreamDialog.getSshUserId(),
                                    destinationAddress: ''
                                };
                                break;

                            case NginxStreamSshR.out:
                                stream.stream.ssh = {
                                    id: parseInt(this._routeStreamDialog.getSshListen(), 10),
                                    port: 0,
                                    username: '',
                                    password: '',
                                    user_id: 0,
                                    destinationAddress: ''
                                };
                                break;
                        }
                        break;

                    case NginxStreamDestinationType.ssh_l:
                        stream.stream.ssh = {
                            id: this._routeStreamDialog.getSshPortId(),
                            port: this._routeStreamDialog.getSshPort(),
                            username: this._routeStreamDialog.getSshUsername(),
                            password: this._routeStreamDialog.getSshPassword(),
                            user_id: this._routeStreamDialog.getSshUserId(),
                            destinationAddress: this._routeStreamDialog.getSshDestinationAddress()
                        };
                        break;
                }

                if (await RouteAPI.saveRouteStream(stream)) {
                    this._routeStreamDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

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

        // -------------------------------------------------------------------------------------------------------------

        this._routeHttpDialog.setOnSave(async(): Promise<void> => {
            let tid = this._routeHttpDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const http: RouteHttpSave = {
                    domainid: this._routeHttpDialog.getDomainId(),
                    http: {
                        id: tid,
                        index: this._routeHttpDialog.getIndex(),
                        listen_id: this._routeHttpDialog.getListen(),
                        ssl: {
                            enable: this._routeHttpDialog.getSslEnable(),
                            provider: this._routeHttpDialog.getSslProvider(),
                            email: this._routeHttpDialog.getSslEmail()
                        },
                        locations: this._routeHttpDialog.getLocations(),
                        http2_enable: this._routeHttpDialog.getHttp2Enable(),
                        x_frame_options: this._routeHttpDialog.getXFrameOptions()
                    }
                };

                if (await RouteAPI.saveRouteHttp(http)) {
                    this._routeHttpDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Http save success.'
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
        const content = this._wrapper.getContentWrapper().getContent();

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            content.empty();

            // listens -------------------------------------------------------------------------------------------------

            const listenMap: Map<number, ListenData> = new Map<number, ListenData>();
            const listens = await ListenAPI.getListens();

            if (listens) {
                this._routeStreamDialog.setListens(listens.list);
                this._routeHttpDialog.setListens(listens.list);

                for (const alisten of listens.list) {
                    listenMap.set(alisten.id, alisten);
                }
            }

            // routes --------------------------------------------------------------------------------------------------

            const routes = await RouteAPI.getRoutes();

            if (routes) {
                const dnsserverport = routes.defaults?.dnsserverport || 5333;

                for (const entry of routes.list) {
                    const row = new ContentRow(content);
                    const card = new Card(new ContentCol(row, ContentColSize.col12));

                    jQuery('<span>Routes for Domain:&nbsp;</span>').appendTo(card.getTitleElement());

                    card.showLoading();

                    if (entry.domainfix) {
                        // eslint-disable-next-line no-new
                        new Badge(card.getTitleElement(), 'default', BadgeType.danger);
                    } else {
                        // eslint-disable-next-line no-new
                        new Badge(card.getTitleElement(), `${entry.domainname}`, BadgeType.secondary);

                        card.getTitleElement().append('&nbsp;');

                        const btnOpenUrl = new ButtonMenu(
                            card.getTitleElement(),
                            IconFa.share,
                            true,
                            ButtonType.borderless
                        );

                        btnOpenUrl.addMenuItem(`http://${entry.domainname}`, () => {
                            window.open(`http://${entry.domainname}`, '_blank');
                        });

                        btnOpenUrl.addMenuItem(`https://${entry.domainname}`, () => {
                            window.open(`https://${entry.domainname}`, '_blank');
                        });
                    }

                    if (!entry.domainfix) {
                        const btnMenu = new ButtonMenu(card.getToolsElement(), IconFa.bars, true, ButtonType.borderless);

                        btnMenu.addMenuItem(
                            'Add Stream Route',
                            async(): Promise<void> => {
                                this._routeStreamDialog.resetValues();
                                this._routeStreamDialog.setTitle('Add Stream Route');
                                this._routeStreamDialog.show();
                                this._routeStreamDialog.setDomainName(entry.domainname);
                                this._routeStreamDialog.setDomainId(entry.id);

                                const sshListens = await SshAPI.getList();

                                if (sshListens) {
                                    this._routeStreamDialog.setSshListens(sshListens.list);
                                }
                            },
                            IconFa.add);

                        btnMenu.addMenuItem(
                            'Add Http/Https Route',
                            async(): Promise<void> => {
                                this._routeHttpDialog.resetValues();
                                this._routeHttpDialog.setTitle('Add Http/Https Route');
                                this._routeHttpDialog.show();
                                this._routeHttpDialog.setDomainName(entry.domainname);
                                this._routeHttpDialog.setDomainId(entry.id);

                                const sshListens = await SshAPI.getList();

                                if (sshListens) {
                                    this._routeHttpDialog.setSshListens(sshListens.list);
                                }

                                const sslProviders = await SslAPI.getProviders();

                                if (sslProviders) {
                                    this._routeHttpDialog.setSslProviders(sslProviders.list);
                                }
                            },
                            IconFa.add);
                    }

                    // table -------------------------------------------------------------------------------------------

                    const table = new Table(card);
                    const trhead = new Tr(table.getThead());

                    // eslint-disable-next-line no-new
                    new Th(trhead, 'Source', '150px');

                    // eslint-disable-next-line no-new
                    new Th(trhead, ' &#8594; ', '20px');

                    // eslint-disable-next-line no-new
                    new Th(trhead, 'Destination', '150px');

                    // eslint-disable-next-line no-new
                    new Th(trhead, 'Options', '150px');

                    // eslint-disable-next-line no-new
                    new Th(trhead, 'Action');

                    // -------------------------------------------------------------------------------------------------

                    entry.streams.forEach(value => {
                        const trbody = new Tr(table.getTbody());
                        const sdTd = new Td(trbody, '');

                        const listen = listenMap.get(value.listen_id);

                        if (listen) {
                            // eslint-disable-next-line no-new
                            new Badge(sdTd, `${listen.name} (${listen.port})`,
                                listen.type === 0 ? BadgeType.warning : BadgeType.success);
                        }

                        // eslint-disable-next-line no-new
                        new Td(trbody, ' &#8594; ');

                        const sdTdD = new Td(trbody, '');

                        switch (value.destination_type) {
                            case NginxStreamDestinationType.listen:
                                const dlisten = listenMap.get(value.destination_listen_id);

                                if (dlisten) {
                                    // eslint-disable-next-line no-new
                                    new Badge(sdTdD,
                                        `${dlisten.name} (${dlisten.port})`, BadgeType.success
                                    );
                                } else {
                                    // eslint-disable-next-line no-new
                                    new Badge(sdTdD,
                                        `destination listen not found! `, BadgeType.danger
                                    );
                                }
                                break;

                            case NginxStreamDestinationType.ssh_r:
                                switch (value.ssh_r_type) {
                                    case NginxStreamSshR.in:
                                        // eslint-disable-next-line no-new
                                        new Badge(sdTdD, `SSH INTERNT IN (--> ${value.ssh!.port})`, BadgeType.primary);
                                        break;

                                    case NginxStreamSshR.out:
                                        // eslint-disable-next-line no-new
                                        new Badge(sdTdD, `SSH INTERNT OUT (<-- ${value.ssh!.port})`, BadgeType.primary);
                                        break;
                                }
                                break;

                            case NginxStreamDestinationType.upstream:
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

                                    if (value.upstreams.length > 1) {
                                        andMore = ', ...';
                                    }

                                    // eslint-disable-next-line no-new
                                    new Badge(sdTdD,
                                        `${firstUpstream.address}:${firstUpstream.port}${andMore} (${value.alias_name})`,
                                        badType);
                                }
                                break;

                            case NginxStreamDestinationType.ssh_l:
                                // eslint-disable-next-line no-new
                                new Badge(sdTdD, `SSH EXTERN (--> ${value.ssh!.destinationAddress}:${value.ssh!.port})`, BadgeType.color_cream_purpel);
                                break;
                        }

                        // options td ----------------------------------------------------------------------------------

                        // eslint-disable-next-line no-new
                        new Td(trbody, '');

                        // action td -----------------------------------------------------------------------------------

                        const tdAction = new Td(trbody, '');

                        if (!value.isdefault) {
                            const btnMenu = new ButtonMenu(
                                tdAction,
                                IconFa.bars,
                                true,
                                ButtonType.borderless
                            );

                            btnMenu.addMenuItem(
                                'Edit',
                                async(): Promise<void> => {
                                    this._routeStreamDialog.resetValues();
                                    this._routeStreamDialog.setTitle('Edit Stream Route');
                                    this._routeStreamDialog.show();
                                    this._routeStreamDialog.setId(value.id);
                                    this._routeStreamDialog.setDomainName(entry.domainname);
                                    this._routeStreamDialog.setDomainId(entry.id);
                                    this._routeStreamDialog.setListen(`${value.listen_id}`);
                                    this._routeStreamDialog.setAliasName(value.alias_name);
                                    this._routeStreamDialog.setDestinationType(value.destination_type);

                                    if (value.index > 0) {
                                        this._routeStreamDialog.setIndex(value.index);
                                    }

                                    const sshListens = await SshAPI.getList();

                                    if (sshListens) {
                                        this._routeStreamDialog.setSshListens(sshListens.list);
                                    }

                                    if (value.ssh) {
                                        this._routeStreamDialog.setSshRType(value.ssh_r_type);
                                        this._routeStreamDialog.setSshDestinationAddress(value.ssh.destinationAddress);

                                        switch (value.ssh_r_type) {
                                            case NginxStreamSshR.out:
                                                this._routeStreamDialog.setSshListen(value.ssh.id);
                                                break;

                                            default:
                                                this._routeStreamDialog.setSshPortId(value.ssh.id);

                                                if (value.ssh.port > 0) {
                                                    this._routeStreamDialog.setSshPort(value.ssh.port);
                                                }

                                                this._routeStreamDialog.setSshUserId(value.ssh.user_id);
                                                this._routeStreamDialog.setSshUsername(value.ssh.username);
                                        }
                                    } else if (value.destination_listen_id > 0) {
                                        this._routeStreamDialog.setDestinationListen(value.destination_listen_id);
                                    } else {
                                        this._routeStreamDialog.setUpstreamList(value.upstreams);
                                    }
                                },
                                IconFa.edit);

                            btnMenu.addDivider();

                            btnMenu.addMenuItem(
                                'Delete',
                                (): void => {
                                    DialogConfirm.confirm(
                                        'streamDelete',
                                        ModalDialogType.large,
                                        'Delete Stream Route',
                                        `Delete this Stream Route "${entry.domainname}" Alias: ${value.alias_name}?`,
                                        async(_, dialog) => {
                                            try {
                                                if (await RouteAPI.deleteRouteStream({
                                                    id: value.id
                                                })) {
                                                    this._toast.fire({
                                                        icon: 'success',
                                                        title: 'Stream Route delete success.'
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
                            new Badge(sdTd, `${listen.name} (${listen.port})`,
                                listen.type === 0 ? BadgeType.warning : BadgeType.success
                            );
                        }

                        // eslint-disable-next-line no-new
                        new Td(trbody, ' &#8594; ');

                        const sdTdD = new Td(trbody, '');

                        if (value.locations.length > 0) {
                            const aLocation = value.locations[0];

                            if (aLocation.ssh && aLocation.ssh.port_out) {
                                // eslint-disable-next-line no-new
                                new Badge(sdTdD, `SSH INTERNT OUT (<-- ${aLocation.ssh.port_out})`, BadgeType.primary);
                            } else if(aLocation.redirect && (aLocation.redirect.redirect !== '')) {
                                new Badge(sdTdD, `${aLocation.redirect.redirect} (${aLocation.redirect.code})`, BadgeType.secondary);
                            } else {
                                let andMore = '';

                                if (value.locations.length > 1) {
                                    andMore = ', ...';
                                }

                                // eslint-disable-next-line no-new
                                new Badge(sdTdD, `${aLocation.proxy_pass}${andMore}`, BadgeType.info);
                            }
                        } else {
                            sdTdD.addValue('None');
                        }

                        // options td ----------------------------------------------------------------------------------

                        const tdOptions = new Td(trbody, '');

                        if (value.ssl && value.ssl.enable) {
                            const sslTooltip = new Tooltip(tdOptions, `SSL with '${value.ssl.provider}'`);
                            new Icon(sslTooltip, IconFa.lock);
                        }

                        // action td -----------------------------------------------------------------------------------

                        const tdAction = new Td(trbody, '');
                        const btnMenu = new ButtonMenu(tdAction, IconFa.bars, true, ButtonType.borderless);

                        btnMenu.addMenuItem(
                            'Edit',
                            async(): Promise<void> => {
                                this._routeHttpDialog.resetValues();
                                this._routeHttpDialog.setTitle('Edit Http/Https Route');
                                this._routeHttpDialog.show();
                                this._routeHttpDialog.setId(value.id);
                                this._routeHttpDialog.setDomainName(entry.domainname);
                                this._routeHttpDialog.setDomainId(entry.id);
                                this._routeHttpDialog.setIndex(value.index);
                                this._routeHttpDialog.setListen(`${value.listen_id}`);
                                this._routeHttpDialog.setSslEnable(value.ssl.enable);

                                const sshListens = await SshAPI.getList();

                                if (sshListens) {
                                    this._routeHttpDialog.setSshListens(sshListens.list);
                                }

                                const sslProviders = await SslAPI.getProviders();

                                if (sslProviders) {
                                    this._routeHttpDialog.setSslProviders(sslProviders.list);
                                }

                                this._routeHttpDialog.setSslProvider(value.ssl.provider);
                                this._routeHttpDialog.setSslEmail(value.ssl.email);
                                this._routeHttpDialog.setLocations(value.locations);
                                this._routeHttpDialog.setHttp2Enable(value.http2_enable);
                                this._routeHttpDialog.setXFrameOptions(value.x_frame_options);
                            },
                            IconFa.edit);

                        btnMenu.addDivider();

                        btnMenu.addMenuItem(
                            'Delete',
                            (): void => {
                                DialogConfirm.confirm(
                                    'httpDelete',
                                    ModalDialogType.large,
                                    'Delete Http Route',
                                    `Delete this Http Route "${entry.domainname}"?`,
                                    async(_, dialog) => {
                                        try {
                                            if (await RouteAPI.deleteRouteHttp({
                                                id: value.id
                                            })) {
                                                this._toast.fire({
                                                    icon: 'success',
                                                    title: 'Stream Http delete success.'
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
                            },
                            IconFa.trash);
                    });

                    card.hideLoading();
                }
            }
        };

        // load table
        await this._onLoadTable();
    }

}