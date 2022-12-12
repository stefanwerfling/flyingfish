import moment from 'moment';
import {Badge, BadgeType} from '../Bambooo/Content/Badge/Badge';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol, ContentColSize} from '../Bambooo/Content/ContentCol';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {Button, ButtonType} from '../Bambooo/Content/Form/Button';
import {Icon, IconFa} from '../Bambooo/Content/Icon/Icon';
import {NavTab} from '../Bambooo/Content/Tab/NavTab';
import {Table} from '../Bambooo/Content/Table/Table';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {BasePage} from './BasePage';
import {BlacklistCategory, IpAccess as IpAccessAPI, IpAccessLocation, IpAccessMaintainer} from '../Api/IpAccess';
import {IpAccessBlacklistImportModal} from './IpAccess/IpAccessBlacklistImportModal';

/**
 * IpAccess
 */
export class IpAccess extends BasePage {

    /**
     * name
     * @protected
     */
    protected _name: string = 'ipaccess';

    /**
     * import blacklist dialog
     * @protected
     */
    protected _importBlacklistDialog: IpAccessBlacklistImportModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('IP Access');

        this._importBlacklistDialog = new IpAccessBlacklistImportModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add to Blacklist', () => {

        });
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();

        const row = new ContentRow(content);
        const cardIpAccess = new Card(new ContentCol(row, ContentColSize.col12));
        cardIpAccess.setTitle('IpAccess');

        const mainTabs = new NavTab(cardIpAccess, 'ipaccesstabs');
        const tabBlacklist = mainTabs.addTab('Blacklist', 'ipaccesstabblacklist');

        const blacklistbodyCard = jQuery('<div class="card-body"/>').appendTo(tabBlacklist.body);
        const blacklistTabs = new NavTab(blacklistbodyCard, 'bblacklisttabs');

        const tabBlacklistOwn = blacklistTabs.addTab('Own', 'blacklisttabown');
        const tabBlacklistImported = blacklistTabs.addTab('Imports', 'blacklisttabimported');

        const categories: Map<number, string> = new Map<number, string>();

        categories.set(BlacklistCategory.reputation, 'Reputation');
        categories.set(BlacklistCategory.malware, 'Malware');
        categories.set(BlacklistCategory.attacks, 'Attacks');
        categories.set(BlacklistCategory.abuse, 'Abuse');
        categories.set(BlacklistCategory.spam, 'Spam');
        categories.set(BlacklistCategory.organizations, 'Organizations');
        categories.set(BlacklistCategory.geolocation, 'Geolocation');

        const maintainList: Map<number, IpAccessMaintainer> = new Map<number, IpAccessMaintainer>();

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            cardIpAccess.showLoading();

            if (maintainList.size === 0) {
                const maintains = await IpAccessAPI.getMaintainerList();

                if (maintains) {
                    for (const maintain of maintains) {
                        maintainList.set(maintain.id, maintain);
                    }
                }
            }

            // own blacklist -------------------------------------------------------------------------------------------
            tabBlacklistOwn.body.empty();

            const tableO = new Table(tabBlacklistOwn.body);
            const trheadO = new Tr(tableO.getThead());

            // eslint-disable-next-line no-new
            new Th(trheadO, 'IP', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadO, 'Disabled', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadO, 'Last block', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadO, 'Count blocks', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadO, 'Description');

            // eslint-disable-next-line no-new
            new Th(trheadO, 'Action');

            // import blacklist ----------------------------------------------------------------------------------------
            tabBlacklistImported.body.empty();

            const tableB = new Table(tabBlacklistImported.body);
            const trheadB = new Tr(tableB.getThead());

            // eslint-disable-next-line no-new
            new Th(trheadB, 'IP', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadB, 'Last block<br><b>Count blocks</b>', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadB, 'Location info');

            // eslint-disable-next-line no-new
            new Th(trheadB, 'Categories');

            // eslint-disable-next-line no-new
            new Th(trheadB, 'Maintainers');

            // eslint-disable-next-line no-new
            new Th(trheadB, 'Last update', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadB, 'Disabled');

            // eslint-disable-next-line no-new
            new Th(trheadB, 'Action');

            const blackList = await IpAccessAPI.getBlackListImports();

            if (blackList) {
                const locationList: Map<number, IpAccessLocation> = new Map<number, IpAccessLocation>();

                if (blackList.locations) {
                    for (const loction of blackList.locations) {
                        locationList.set(loction.id, loction);
                    }
                }

                for (const bentry of blackList.list!) {
                    const trbodyB = new Tr(tableB.getTbody());

                    const tdIp = new Td(trbodyB, '');
                    new Badge(tdIp, `${bentry.ip}`, BadgeType.secondary);

                    const lastBlock = moment(bentry.last_block * 1000);

                    new Td(trbodyB, `${lastBlock.format('YYYY-MM-DD HH:mm:ss')}<br><b>${bentry.count_block}</b>`);

                    const loactionTd = new Td(trbodyB, 'none');

                    if (bentry.ip_location_id) {
                        const aLocation = locationList.get(bentry.ip_location_id);

                        if (aLocation) {
                            const locationDiv = jQuery('<div class="attachment-block clearfix"></div>').appendTo(
                                loactionTd.getElement().empty()
                            );

                            locationDiv.append(`${aLocation.org ? aLocation.org : '?'}<br>`);
                            locationDiv.append(`${aLocation.city ? aLocation.city : '?'}, ${aLocation.postal_code}<br>`);
                            locationDiv.append(`${aLocation.country}<br>`);
                        }
                    }

                    const tdCate = new Td(trbodyB, '');
                    tdCate.setCss({
                        'white-space': 'normal'
                    });

                    for (const cateId of bentry.categorys) {
                        const cate = categories.get(cateId);

                        if (cate) {
                            new Badge(tdCate, `${cate}`, BadgeType.light);
                            tdCate.append('&nbsp;');
                        }
                    }

                    const tdMain = new Td(trbodyB, '');
                    tdMain.setCss({
                        'white-space': 'normal'
                    });

                    for (const mainId of bentry.maintainers) {
                        const tMain = maintainList.get(mainId);

                        if (tMain) {
                            new Badge(tdMain, `${tMain.maintainer_name}`, BadgeType.primary);
                            tdMain.append('&nbsp;');
                        }
                    }

                    const lastUpdate = moment(bentry.last_update * 1000);

                    new Td(trbodyB, `${lastUpdate.format('YYYY-MM-DD HH:mm:ss')}`);

                    new Td(trbodyB, `${bentry.disable ? 'yes' : 'no'}`);

                    const tdAction = new Td(trbodyB, '');

                    const editBtn = new Button(tdAction, ButtonType.borderless);

                    // eslint-disable-next-line no-new
                    new Icon(editBtn.getElement(), IconFa.edit);

                    editBtn.setOnClickFn((): void => {
                        this._importBlacklistDialog.setTitle('Blacklist Import Edit');
                        this._importBlacklistDialog.resetValues();
                        this._importBlacklistDialog.setId(bentry.id);
                        this._importBlacklistDialog.setDisable(bentry.disable);
                        this._importBlacklistDialog.show();
                    });
                }
            }

            cardIpAccess.hideLoading();
        };

        // load table
        await this._onLoadTable();
    }
}