import {Domain as DomainAPI, DomainData} from '../Api/Domain';
import {Nginx as NginxAPI} from '../Api/Nginx';
import {Badge, BadgeType} from '../Bambooo/Content/Badge/Badge';
import {Button} from '../Bambooo/Content/Form/Button';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol12} from '../Bambooo/Content/ContentCol12';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {Icon, IconFa} from '../Bambooo/Content/Icon/Icon';
import {Table} from '../Bambooo/Content/Table/Table';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {BasePage} from './BasePage';
import {DomainEditModal} from './Domains/DomainEditModal';
import {DomainRecordEditModal} from './Domains/DomainRecordEditModal';

/**
 * onLoadListens
 */
type onLoadDomains = () => void;

/**
 * Domains
 */
export class Domains extends BasePage {

    /**
     * on load table
     * @protected
     */
    protected _onLoadTable: onLoadDomains|null = null;

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
     * toast
     * @protected
     */
    protected _toast: any;

    /**
     * constructor
     */
    public constructor() {
        super();

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
        }, 'btn btn-block btn-default btn-sm');

        this._wrapper.getNavbar().getLeftNavbar().getElement().append('&nbsp;');

        // -------------------------------------------------------------------------------------------------------------

        // @ts-ignore
        this._toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });

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

                    // ignored fields
                    fix: false,
                    recordless: false,
                    records: []
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
            } catch ({message}) {
                this._toast.fire({
                    icon: 'error',
                    title: message
                });
            }
        });

        this._domainRecordDialog.setOnSave(async(): Promise<void> => {
            let tid = this._domainDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {

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
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol12(row1));

        card.setTitle('Domains');

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Id');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Domainname/Zone');

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();
            table.getTbody().empty();

            const domains = await DomainAPI.getDomains();

            if (domains && domains.list) {
                card.setTitle(`Domains (${domains.list.length})`);

                for (const domain of domains.list) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${domain.id}`);

                    // eslint-disable-next-line no-new
                    const domainTd = new Td(trbody, '');

                    if (domain.fix) {
                        // eslint-disable-next-line no-new
                        new Badge(domainTd.getElement(), `${domain.name}`, BadgeType.danger);
                    } else {
                        // eslint-disable-next-line no-new
                        new Badge(domainTd.getElement(), `${domain.name}`, BadgeType.secondary);
                    }

                    const tdAction = new Td(trbody, '');

                    if (!domain.fix) {
                        const editBtn = new Button(tdAction.getElement());
                        // eslint-disable-next-line no-new
                        new Icon(editBtn.getElement(), IconFa.edit);

                        editBtn.setOnClickFn((): void => {
                            this._domainDialog.setTitle('Domain Edit');
                            this._domainDialog.resetValues();
                            this._domainDialog.setId(domain.id);
                            this._domainDialog.setName(domain.name);
                            this._domainDialog.show();
                        });
                    }

                    if (!domain.recordless) {
                        const addBtn = new Button(tdAction.getElement());
                        // eslint-disable-next-line no-new
                        new Icon(addBtn.getElement(), IconFa.add);

                        addBtn.setOnClickFn((): void => {
                            this._domainRecordDialog.resetValues();
                            this._domainRecordDialog.setTitle('Domain Record Add');
                            this._domainRecordDialog.setDomainId(domain.id);
                            this._domainRecordDialog.setDomainName(domain.name);
                            this._domainRecordDialog.show();
                        });
                    }

                    if (!domain.fix) {
                        const delBtn = new Button(tdAction.getElement());
                        // eslint-disable-next-line no-new
                        new Icon(delBtn.getElement(), IconFa.trash);
                    }

                    if (domain.records.length > 0 ) {
                        const lrtrbody = new Tr(table.getTbody());

                        // eslint-disable-next-line no-new
                        new Td(lrtrbody, '');

                        const lineTd = new Td(lrtrbody, '', 2);

                        // record table
                        const rtable = new Table(lineTd.getElement());
                        const rtrhead = new Tr(rtable.getThead());

                        // eslint-disable-next-line no-new
                        new Th(rtrhead, 'Type');

                        // eslint-disable-next-line no-new
                        new Th(rtrhead, 'Class');

                        // eslint-disable-next-line no-new
                        new Th(rtrhead, 'Value');

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
                            new Td(rtrbody, `${record.value}`);

                            const tdRAction = new Td(rtrbody, '');

                            const editRBtn = new Button(tdRAction.getElement());
                            // eslint-disable-next-line no-new
                            new Icon(editRBtn.getElement(), IconFa.edit);

                            editRBtn.setOnClickFn((): void => {
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
                            })
                        }
                    }
                }
            }

            card.hideLoading();
        };

        // load table
        await this._onLoadTable();
    }

}