import {ListenData} from 'flyingfish_schemas';
import {Listen as ListenAPI, ListenTypes} from '../Api/Listen.js';
import {Nginx as NginxAPI} from '../Api/Nginx.js';
import {ContentCol, ContentColSize, ContentRow, DialogConfirm,
    IconFa, ModalDialogType, LeftNavbarLink} from 'bambooo';
import {BasePage} from './BasePage.js';
import {ListensEditModal} from './Listens/ListensEditModal.js';
import {ListenCard} from './Listens/ListenCard.js';

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
        // the listeners as .ffr cards (same look as the Router page's interface cards),
        // grouped into External (stream) / Internal (http).
        const listRow = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const root = jQuery('<div class="ffr ffr-listcards"></div>')
            .appendTo(jQuery(new ContentCol(listRow, ContentColSize.col12).getElement()));
        const head = jQuery('<div class="lc-head"></div>').appendTo(root);
        jQuery('<span class="t">Listeners</span>').appendTo(head);
        const countEl = jQuery('<span class="c"></span>').appendTo(head);
        const body = jQuery('<div></div>').appendTo(root);

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

            const streams = listens.list.filter((entry) => entry.type === ListenTypes.stream);
            const https = listens.list.filter((entry) => entry.type !== ListenTypes.stream);

            const renderGroup = (label: string, entries: ListenData[]): void => {
                if (entries.length === 0) {
                    return;
                }

                jQuery(`<div class="lc-group">${label} <span class="n">${entries.length}</span></div>`).appendTo(body);
                const grid = jQuery('<div class="ffr-grid"></div>').appendTo(body);

                for (const entry of entries) {
                    // eslint-disable-next-line no-new
                    new ListenCard(grid, entry, {
                        onEdit: () => this._openListenEdit(entry),
                        onDelete: entry.fix ? undefined : () => this._deleteListen(entry)
                    });
                }
            };

            renderGroup('External · stream', streams);
            renderGroup('Internal · http', https);

            if (listens.list.length === 0) {
                jQuery('<div class="ffr-empty">No listeners yet — add one to get started.</div>').appendTo(body);
            }
        };

        // load list
        this._onLoadTable();
    }

}