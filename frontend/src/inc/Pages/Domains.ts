import {
    Badge,
    BadgeType,
    Button,
    ButtonClass,
    ButtonDefault,
    ButtonMenu,
    ButtonType,
    Card,
    CardBodyType,
    CardLine,
    CardType,
    ContentCol,
    ContentColSize,
    ContentRow,
    DialogConfirm,
    IconFa,
    InfoBox,
    InfoBoxBg,
    InfoBoxMb,
    LeftNavbarLink,
    ModalDialogType,
    Table,
    Td,
    Th,
    Tr
} from 'bambooo';
import {DomainData} from 'flyingfish_schemas';
import moment from 'moment';
import {Vts} from 'vts';
import {Domain as DomainAPI} from '../Api/Domain.js';
import {Nginx as NginxAPI} from '../Api/Nginx.js';
import {BasePage} from './BasePage.js';
import {DomainEditModal} from './Domains/DomainEditModal.js';
import {DomainRecordEditModal} from './Domains/DomainRecordEditModal.js';

/**
 * Domains
 */
export class Domains extends BasePage {

    /**
     * name
     * @protected
     */
    protected override _name: string = 'domains';

    /**
     * domain dialog
     * @protected
     */
    protected _domainDialog: DomainEditModal;

    /**
     * domain record dialog
     * @protected
     */
    protected _domainRecordDialog: DomainRecordEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Domains');

        this._domainDialog = new DomainEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        this._domainRecordDialog = new DomainRecordEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Domain', () => {
            this._domainDialog.resetValues();
            this._domainDialog.setTitle('Domain Add');
            this._domainDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        this._wrapper.getNavbar().getLeftNavbar().getElement().append('&nbsp;');

        // -------------------------------------------------------------------------------------------------------------

        this._domainDialog.setOnSave(async(): Promise<void> => {
            let tid = this._domainDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const domain: DomainData = {
                    id: tid,
                    name: this._domainDialog.getName(),
                    disable: this._domainDialog.getDisable(),

                    // ignored fields
                    fix: false,
                    recordless: false,
                    records: [],
                    parent_id: 0
                };

                if (await DomainAPI.saveDomain(domain)) {
                    this._domainDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Domain save success.'
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

        this._domainRecordDialog.setOnSave(async(): Promise<void> => {
            let tid = this._domainRecordDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            const domainId = this._domainRecordDialog.getDomainId();

            if (domainId === null) {
                this._toast.fire({
                    icon: 'error',
                    title: 'Domain id is empty!'
                });
                return;
            }

            try {
                if (await DomainAPI.saveDomainRecord({
                    domain_id: domainId,
                    record: {
                        id: tid,
                        type: parseInt(this._domainRecordDialog.getType(), 10),
                        class: parseInt(this._domainRecordDialog.getClass(), 10),
                        ttl: parseInt(this._domainRecordDialog.getTTL(), 10),
                        value: this._domainRecordDialog.getValue(),
                        update_by_dnsclient: this._domainRecordDialog.getUpdateByDynDnsClient(),
                        last_update: 0
                    }
                })) {
                    this._domainRecordDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Domain record save success.'
                    });
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
    public override async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            content.empty();

            const domains = await DomainAPI.getDomains();

            // map domains by parent -----------------------------------------------------------------------------------

            const domainMap = new Map<number, DomainData[]>();

            if (domains && domains.list) {
                for (const domain of domains.list) {
                    if (!domainMap.has(domain.parent_id)) {
                        domainMap.set(domain.parent_id, []);
                    }

                    const domainCollection = domainMap.get(domain.parent_id);

                    if (!Vts.isUndefined(domainCollection)) {
                        domainCollection.push(domain);

                        domainMap.set(domain.parent_id, domainCollection);
                    }
                }
            }

            // ---------------------------------------------------------------------------------------------------------

            const loadDomain = (parentId: number, parentElement: any): void => {
                const collection = domainMap.get(parentId);

                if (collection && collection.length > 0) {
                    for (const domain of collection) {
                        if (domain.name === '_') {
                            // eslint-disable-next-line no-continue
                            continue;
                        }

                        let appendElement = parentElement;

                        if (domain.parent_id !== 0) {
                            const rowParent = new ContentRow(parentElement);

                            const colParent = new ContentCol(rowParent, ContentColSize.col12);
                            appendElement = colParent.getElement();
                        }

                        const card = new Card(
                            appendElement,
                            CardBodyType.none,
                            CardType.primary,
                            CardLine.outline
                        );

                        card.getMainElement().addClass('collapsed-card');

                        // eslint-disable-next-line no-new
                        new Button(card.getTitleElement(), ButtonType.cardCollapse);

                        // jQuery('<span>Domainname/Zone:&nbsp;</span>').appendTo(card.getTitleElement());

                        const btnOpenUrl = new ButtonMenu(
                            card.getTitleElement(),
                            null,
                            false,
                            ButtonType.borderless
                        );

                        if (domain.fix) {
                            // eslint-disable-next-line no-new
                            new Badge(btnOpenUrl, `${domain.name}`, BadgeType.danger);
                        } else {
                            // eslint-disable-next-line no-new
                            new Badge(btnOpenUrl, `${domain.name}`, domain.disable ? BadgeType.secondary : BadgeType.primary);
                        }

                        btnOpenUrl.addMenuItem(`http://${domain.name}`, () => {
                            window.open(`http://${domain.name}`, '_blank');
                        }, IconFa.external_link);

                        btnOpenUrl.addMenuItem(`https://${domain.name}`, () => {
                            window.open(`https://${domain.name}`, '_blank');
                        }, IconFa.external_link);

                        btnOpenUrl.addDivider();

                        btnOpenUrl.addMenuItem('Copy to clipboard', () => {
                            navigator.clipboard.writeText(domain.name);

                            this._toast.fire({
                                icon: 'success',
                                title: 'Domainname copy to clipboard'
                            });

                        }, IconFa.copy);

                        const funcEdit = (): void => {
                            this._domainDialog.setTitle('Domain Edit');
                            this._domainDialog.resetValues();
                            this._domainDialog.setId(domain.id);
                            this._domainDialog.setName(domain.name);
                            this._domainDialog.setDisable(domain.disable);
                            this._domainDialog.show();
                        };

                        if (domain.disable) {
                            card.getTitleElement().append('&nbsp;&nbsp;');

                            const button = new ButtonDefault(card.getTitleElement(), 'Reactivate');
                            button.setOnClickFn(funcEdit);
                        }

                        // ---------------------------------------------------------------------------------------------

                        const childrenDomains = domainMap.get(domain.id);
                        let childrenDomainCounts = 0;

                        if (childrenDomains) {
                            childrenDomainCounts = childrenDomains.length;
                        }

                        // eslint-disable-next-line no-new
                        new Badge(card.getToolsElement(), `${childrenDomainCounts}`, BadgeType.primary);

                        card.getToolsElement().append('&nbsp;');

                        // eslint-disable-next-line no-new
                        new Badge(card.getToolsElement(), `${domain.records.length}`, BadgeType.success);

                        card.getToolsElement().append('&nbsp;');

                        const btnMenu = new ButtonMenu(
                            card.getToolsElement(),
                            IconFa.bars,
                            true,
                            ButtonType.borderless
                        );

                        if (!domain.fix) {
                            btnMenu.addMenuItem(
                                'Edit',
                                funcEdit,
                                IconFa.edit
                            );
                        }

                        if (!domain.recordless) {
                            btnMenu.addMenuItem(
                                'Add Record',
                                (): void => {
                                    this._domainRecordDialog.resetValues();
                                    this._domainRecordDialog.setTitle('Domain Record Add');
                                    this._domainRecordDialog.setDomainId(domain.id);
                                    this._domainRecordDialog.setDomainName(domain.name);
                                    this._domainRecordDialog.show();
                                },
                                IconFa.add
                            );
                        }

                        if (!domain.fix) {
                            btnMenu.addDivider();
                            btnMenu.addMenuItem(
                                'Delete',
                                (): void => {
                                    DialogConfirm.confirm(
                                        'dcDeleteDomain',
                                        ModalDialogType.large,
                                        'Delete Domain',
                                        'Are you sure to delete the domain? All data on the domain will also be deleted!',
                                        async(_, dialog) => {
                                            try {
                                                if (await DomainAPI.deleteDomain(domain)) {
                                                    this._toast.fire({
                                                        icon: 'success',
                                                        title: 'Domain delete success.'
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

                        if (domain.records.length > 0) {
                            card.showLoading();

                            // record table
                            const rtable = new Table(card.getElement());
                            const rtrhead = new Tr(rtable.getThead());

                            // eslint-disable-next-line no-new
                            new Th(rtrhead, 'Type');

                            // eslint-disable-next-line no-new
                            new Th(rtrhead, 'Class');

                            // eslint-disable-next-line no-new
                            new Th(rtrhead, 'TTL');

                            // eslint-disable-next-line no-new
                            new Th(rtrhead, 'Value');

                            // eslint-disable-next-line no-new
                            new Th(rtrhead, 'Last Update');

                            // eslint-disable-next-line no-new
                            new Th(rtrhead, '');

                            for (const record of domain.records) {
                                const rtrbody = new Tr(rtable.getTbody());

                                const typeTd = new Td(rtrbody, '');
                                let bageType = BadgeType.secondary;
                                let typeName = 'unknow';

                                switch (record.type) {
                                    case 1:
                                        bageType = BadgeType.color_cream_red;
                                        typeName = 'A';
                                        break;

                                    case 2:
                                        bageType = BadgeType.color_cream_blue;
                                        typeName = 'NS';
                                        break;

                                    case 5:
                                        bageType = BadgeType.color_cream_green;
                                        typeName = 'CNAME';
                                        break;

                                    case 15:
                                        bageType = BadgeType.color_cream_yellow;
                                        typeName = 'MX';
                                        break;

                                    case 16:
                                        bageType = BadgeType.color_cream_purpel;
                                        typeName = 'TXT';
                                        break;

                                    case 17:
                                        bageType = BadgeType.color_cream_rorange;
                                        typeName = 'AAAA';
                                        break;
                                }

                                // eslint-disable-next-line no-new
                                new Badge(typeTd.getElement(), `${typeName}`, bageType);

                                // eslint-disable-next-line no-useless-assignment
                                let className = '';

                                switch (record.class) {
                                    case 1:
                                        className = 'IN';
                                        break;

                                    case 2:
                                        className = 'CS';
                                        break;

                                    case 3:
                                        className = 'CH';
                                        break;

                                    case 4:
                                        className = 'HS';
                                        break;

                                    default:
                                        className = 'ANY';
                                }

                                // eslint-disable-next-line no-new
                                new Td(rtrbody, `${className}`);

                                // eslint-disable-next-line no-new
                                new Td(rtrbody, `${record.ttl}`);

                                // eslint-disable-next-line no-new
                                new Td(rtrbody, `${record.value}`);

                                const date = moment(record.last_update * 1000);

                                // eslint-disable-next-line no-new
                                new Td(rtrbody, date.format('<b>YYYY-MM-DD</b> HH:mm:ss'));

                                const tdRAction = new Td(rtrbody, '');

                                if (!domain.disable) {
                                    const btnRMenu = new ButtonMenu(
                                        tdRAction.getElement(),
                                        IconFa.bars,
                                        true,
                                        ButtonType.borderless
                                    );

                                    btnRMenu.addMenuItem(
                                        'Edit',
                                        (): void => {
                                            this._domainRecordDialog.resetValues();
                                            this._domainRecordDialog.setTitle('Domain Record Edit');
                                            this._domainRecordDialog.setId(record.id);
                                            this._domainRecordDialog.setDomainId(domain.id);
                                            this._domainRecordDialog.setDomainName(domain.name);
                                            this._domainRecordDialog.setType(`${record.type}`);
                                            this._domainRecordDialog.setClass(`${record.class}`);
                                            this._domainRecordDialog.setTTL(`${record.ttl}`);
                                            this._domainRecordDialog.setValue(record.value);
                                            this._domainRecordDialog.setUpdateByDynDnsClient(record.update_by_dnsclient);
                                            this._domainRecordDialog.show();
                                        },
                                        IconFa.edit
                                    );

                                    btnRMenu.addDivider();

                                    btnRMenu.addMenuItem(
                                        'Delete',
                                        (): void => {
                                            DialogConfirm.confirm(
                                                'dcDeleteRecord',
                                                ModalDialogType.large,
                                                'Delete Record',
                                                'Are you sure you want to delete the record?',
                                                async(
                                                    _,
                                                    dialog
                                                ) => {
                                                    try {
                                                        if (await DomainAPI.deleteDomainRecord(record)) {
                                                            this._toast.fire({
                                                                icon: 'success',
                                                                title: 'Domain record delete success.'
                                                            });
                                                        }
                                                    } catch (message) {
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

                            card.hideLoading();
                        } else {
                            card.getElement().addClass('text-center');
                            jQuery('<div>None Records set.</div>').appendTo(card.getElement());
                        }

                        card.getElement().append('<br>');

                        loadDomain(domain.id, card.getElement());
                    }
                }
            };

            // ---------------------------------------------------------------------------------------------------------

            const row1 = new ContentRow(content);
            loadDomain(0, new ContentCol(row1, ContentColSize.col12));

            if (domainMap.size <= 0) {
                const ib = new InfoBox(new ContentCol(row1, ContentColSize.col12), InfoBoxBg.none, InfoBoxMb.none);
                ib.setIcon(IconFa.info, InfoBoxBg.info);
                ib.getTextElement().append('None Domain exist, please add a new Domain!');
            }
        };

        // load table
        this._onLoadTable();
    }

}