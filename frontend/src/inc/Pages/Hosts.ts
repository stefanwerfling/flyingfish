import {Host as HostAPI} from '../Api/Host';
import {Listen as ListenAPI, ListenData} from '../Api/Listen';
import {Nginx as NginxAPI} from '../Api/Nginx';
import {Badge, BadgeType} from '../Bambooo/Content/Badge/Badge';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol12} from '../Bambooo/Content/ContentCol12';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {Table} from '../Bambooo/Content/Table/Table';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {BasePage} from './BasePage';
import {HostEditModal} from './Hosts/HostEditModal';

/**
 * Hosts Page
 */
export class Hosts extends BasePage {

    /**
     * host dialog
     * @protected
     */
    protected _hostDialog: HostEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        // host modal -------------------------------------------------------------------------------------------------

        this._hostDialog = new HostEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Host', () => {
            this._hostDialog.setTitle('Add new domain');
            this._hostDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm');

        this._wrapper.getNavbar().getLeftNavbar().getElement().append('&nbsp;');

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
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol12(row1));

        card.setTitle('Hosts');

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Id');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Domain');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Source &#8594; Destination');

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        /**
         * onLoadList
         */
        const onLoadList = async(): Promise<void> => {
            card.showLoading();
            table.getTbody().empty();

            // listens -------------------------------------------------------------------------------------------------

            const listenMap: Map<number, ListenData> = new Map<number, ListenData>();
            const listens = await ListenAPI.getListens();

            if (listens) {
                this._hostDialog.setListens(listens.list);

                for (const alisten of listens.list) {
                    listenMap.set(alisten.id, alisten);
                }
            }

            // domains -------------------------------------------------------------------------------------------------

            const domains = await HostAPI.getHosts();

            if (domains) {
                card.setTitle(`Domains (${domains.list.length})`);

                for (const entry of domains.list) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${entry.id}`);

                    const domainTd = new Td(trbody, '');

                    if (entry.domainname === '_') {
                        // eslint-disable-next-line no-new
                        new Badge(domainTd.getElement(), 'default', BadgeType.danger);
                    } else {
                        // eslint-disable-next-line no-new
                        new Badge(domainTd.getElement(), `${entry.domainname}`, BadgeType.secondary);
                    }

                    const sdTd = new Td(trbody, '');

                    entry.streams.forEach(value => {
                        const sdDiv = jQuery('<div/>').appendTo(sdTd.getElement());

                        const listen = listenMap.get(value.listen_id);

                        if (listen) {

                            // eslint-disable-next-line no-new
                            new Badge(sdDiv, `${listen.name} (${listen.port})`,
                                listen.type === 0 ? BadgeType.warning : BadgeType.success);
                        }

                        sdDiv.append(' &#8594; ');


                        if (value.ssh.port_in) {
                            // eslint-disable-next-line no-new
                            new Badge(sdDiv, `ssh (--> ${value.ssh.port_in})`, BadgeType.primary);
                        } else if(value.ssh.port_out) {
                            // eslint-disable-next-line no-new
                            new Badge(sdDiv, `ssh (<-- ${value.ssh.port_out})`, BadgeType.primary);
                        } else {
                            if (value.upstreams.length === 0) {
                                sdDiv.append('None');
                            } else {
                                const firstUpstream = value.upstreams[0];

                                let badType = BadgeType.warning;

                                if (firstUpstream.address === '127.0.0.1') {
                                    badType = BadgeType.success;
                                }

                                let andMore = '';

                                if (value.upstreams.length>1) {
                                    andMore = ', ...'
                                }

                                // eslint-disable-next-line no-new
                                new Badge(sdDiv,
                                    `${firstUpstream.address}:${firstUpstream.port}${andMore} (${value.alias_name})`,
                                    badType);
                            }
                        }
                    });

                    entry.https.forEach(value => {
                        const sdDiv = jQuery('<div/>').appendTo(sdTd.getElement());

                        const listen = listenMap.get(value.listen_id);

                        if (listen) {
                            // eslint-disable-next-line no-new
                            new Badge(sdDiv, `${listen.name} (${listen.port})`,
                                listen.type === 0 ? BadgeType.warning : BadgeType.success
                            );
                        }

                        sdDiv.append(' &#8594; ');

                        if (value.locations.length > 0) {
                            const aLocation = value.locations[0];

                            if (aLocation.ssh.port_out) {
                                // eslint-disable-next-line no-new
                                new Badge(sdDiv, `ssh (<-- ${aLocation.ssh.port_out})`, BadgeType.primary);
                            } else {
                                // eslint-disable-next-line no-new
                                new Badge(sdDiv, aLocation.proxy_pass, BadgeType.info);
                            }
                        } else {
                            sdDiv.append('None');
                        }
                    });

                    // eslint-disable-next-line no-new
                    new Td(trbody, '');
                }
            }

            card.hideLoading();
        };


        // load table
        await onLoadList();
    }

}