import {ListenData} from 'flyingfish_schemas';
import {Listen as ListenAPI, ListenAddressCheckType, ListenTypes} from '../Api/Listen.js';
import {Nginx as NginxAPI} from '../Api/Nginx.js';
import {ContentCol, ContentColSize, ContentRow, DialogConfirm, ButtonType,
    ButtonMenu, IconFa, ModalDialogType, LeftNavbarLink} from 'bambooo';
import {BasePage} from './BasePage.js';
import {ListensEditModal} from './Listens/ListensEditModal.js';
import {ListensPortFlow} from './Listens/ListensPortFlow.js';
import './Listens/listens-list.css';

/**
 * Listens
 */
export class Listens extends BasePage {

    /**
     * name
     * @protected
     */
    protected override _name: string = 'listens';

    /**
     * listen to dialog
     * @protected
     */
    protected _listenDialog: ListensEditModal;

    /**
     * toast
     * @protected
     */
    protected override _toast: any;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Listens');

        // route modal -------------------------------------------------------------------------------------------------

        this._listenDialog = new ListensEditModal();

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
                    proxy_protocol_in: this._listenDialog.getProxyProtocolIn(),
                    stream_server_variables: this._listenDialog.getStreamServerVariables()
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
     * Open the edit dialog pre-filled for a listen (shared by the table row menu and the
     * port-flow graphic click).
     * @param entry - the listen to edit
     * @protected
     */
    protected _openListenEdit(entry: ListenData): void {
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
        this._listenDialog.setStreamServerVariables(entry.stream_server_variables);
        this._listenDialog.show();
    }

    /**
     * Render one listener as an .ffr row (LED, port, badge, name, flow hint, option chips,
     * action menu).
     * @param body - the list body element
     * @param entry - the listen
     * @protected
     */
    protected _renderListenRow(body: JQuery, entry: ListenData): void {
        const stream = entry.type === ListenTypes.stream;
        const row = jQuery(`<div class="ffl-row ${entry.disable ? 'off' : ''}"></div>`).appendTo(body);

        jQuery('<span class="ffl-led"></span>').appendTo(row);
        jQuery(`<span class="ffl-port">:${entry.port}</span>`).appendTo(row);
        jQuery(`<span class="ffl-badge ${stream ? 'stream' : 'http'}">${stream ? 'stream' : 'http'}</span>`).appendTo(row);
        jQuery('<span class="ffl-name"></span>').text(entry.name || '—').appendTo(row);
        jQuery(`<span class="ffl-flow">${Listens._flowHint(entry)}</span>`).appendTo(row);

        const chips = jQuery('<span class="ffl-chips"></span>').appendTo(row);

        if (entry.enable_ipv6) {
            jQuery('<span class="ffl-chip">IPv6</span>').appendTo(chips);
        }

        if (entry.proxy_protocol) {
            jQuery('<span class="ffl-chip">proxy</span>').appendTo(chips);
        }

        if (entry.proxy_protocol_in) {
            jQuery('<span class="ffl-chip">proxy-in</span>').appendTo(chips);
        }

        if (entry.check_address) {
            const kind = entry.check_address_type === ListenAddressCheckType.white ? 'whitelist' : 'blacklist';
            jQuery(`<span class="ffl-chip acc">IP ${kind}</span>`).appendTo(chips);
        }

        const menuWrap = jQuery('<span class="ffl-menu"></span>').appendTo(row);
        const menu = new ButtonMenu(menuWrap[0] as unknown as HTMLElement, IconFa.bars, true, ButtonType.borderless);
        menu.addMenuItem('Edit', () => this._openListenEdit(entry), IconFa.edit);

        if (!entry.fix) {
            menu.addDivider();
            menu.addMenuItem('Delete', () => this._deleteListen(entry), IconFa.trash);
        }
    }

    /**
     * The flow-hint text for a listener row (where its traffic goes next).
     * @param entry - the listen
     * @protected
     */
    protected static _flowHint(entry: ListenData): string {
        if (entry.type !== ListenTypes.stream) {
            return '<span class="ar">→</span>backend';
        }

        const n = (entry.name || '').toLowerCase();

        if (entry.port === 53 || n.includes('dns')) {
            return '<span class="ar">→</span>DNS server';
        }

        if (entry.port === 443 || n.includes('ssl') || n.includes('https')) {
            return '<span class="ar">→</span>:10443';
        }

        if (entry.port === 80 || n.includes('http')) {
            return '<span class="ar">→</span>:10080';
        }

        return '<span class="ar">→</span>upstream';
    }

    /**
     * Confirm + delete a listener, then reload nginx and refresh the list.
     * @param entry - the listen
     * @protected
     */
    protected _deleteListen(entry: ListenData): void {
        DialogConfirm.confirm(
            'dcDelete',
            ModalDialogType.small,
            'Delete Listen',
            `Delete this Listen "${entry.name}" Port: ${entry.port}?`,
            async(_, dialog) => {
                try {
                    if (await ListenAPI.deleteListen(entry)) {
                        this._toast.fire({icon: 'success', title: 'Listen delete success.'});

                        if (await NginxAPI.reload()) {
                            this._toast.fire({icon: 'success', title: 'Nginx server reload config success.'});
                        } else {
                            this._toast.fire({icon: 'error', title: 'Nginx server reload config faild, please check your last settings!'});
                        }
                    }
                } catch (message) {
                    this._toast.fire({icon: 'error', title: message});
                }

                dialog.hide();

                if (this._onLoadTable) {
                    this._onLoadTable();
                }
            },
            undefined,
            'Delete'
        );
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        // port-flow graphic (top): a data-driven diagram of how these listeners route
        // through nginx to the backends. Fed from the same listen list as the table below.
        const flowRow = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const portFlow = new ListensPortFlow(
            jQuery(new ContentCol(flowRow, ContentColSize.col12).getElement()),
            (listen): void => {
                this._openListenEdit(listen as unknown as ListenData);
            }
        );

        // the listener list as grouped .ffr rows (External stream / Internal http),
        // pairing with the port-flow map above.
        const listRow = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const listRoot = jQuery('<div class="ffr ffr-listens"></div>')
            .appendTo(jQuery(new ContentCol(listRow, ContentColSize.col12).getElement()));
        const panel = jQuery('<div class="ffl-panel"></div>').appendTo(listRoot);
        const head = jQuery('<div class="ffl-head"></div>').appendTo(panel);
        jQuery('<span class="t">Listeners</span>').appendTo(head);
        const countEl = jQuery('<span class="c"></span>').appendTo(head);
        const body = jQuery('<div class="ffl-body"></div>').appendTo(panel);

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            const listens = await ListenAPI.getListens();
            body.empty();

            if (!listens) {
                return;
            }

            countEl.text(`${listens.list.length} total`);
            portFlow.setData(listens.list);

            const streams = listens.list.filter((entry) => entry.type === ListenTypes.stream);
            const https = listens.list.filter((entry) => entry.type !== ListenTypes.stream);

            const renderGroup = (label: string, entries: ListenData[]): void => {
                if (entries.length === 0) {
                    return;
                }

                jQuery(`<div class="ffl-group-title">${label} <span class="n">${entries.length}</span></div>`).appendTo(body);

                for (const entry of entries) {
                    this._renderListenRow(body, entry);
                }
            };

            renderGroup('External · stream', streams);
            renderGroup('Internal · http', https);

            if (listens.list.length === 0) {
                jQuery('<div class="ffl-empty">No listeners yet — add one to get started.</div>').appendTo(body);
            }
        };

        // load table
        this._onLoadTable();
    }

}