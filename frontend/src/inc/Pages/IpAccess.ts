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
import {
    BlacklistCategory,
    IpAccess as IpAccessAPI, IpAccessBlackListOwn,
    IpAccessBlackListImportSaveRequest,
    IpAccessLocation,
    IpAccessMaintainer, IpAccessWhiteSaveRequest
} from '../Api/IpAccess';
import {IpAccessBlacklistImportModal} from './IpAccess/IpAccessBlacklistImportModal';
import {IpAccessBlacklistOwnModal} from './IpAccess/IpAccessBlacklistOwnModal';
import {IpAccessWhitelistModal} from './IpAccess/IpAccessWhitelistModal';

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
     * own blacklist dialog
     * @protected
     */
    protected _ownBlacklistDialog: IpAccessBlacklistOwnModal;

    /**
     * whitelist dialog
     * @protected
     */
    protected _whitelistDialog: IpAccessWhitelistModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('IP Access');

        this._importBlacklistDialog = new IpAccessBlacklistImportModal(
            this._wrapper.getContentWrapper().getContent()
        );

        this._ownBlacklistDialog = new IpAccessBlacklistOwnModal(
            this._wrapper.getContentWrapper().getContent()
        );

        this._whitelistDialog = new IpAccessWhitelistModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Blacklist', () => {
            this._ownBlacklistDialog.resetValues();
            this._ownBlacklistDialog.setTitle('Blacklist Add');
            this._ownBlacklistDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm');

        this._wrapper.getNavbar().getLeftNavbar().getElement().append('&nbsp;');

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Whitelist', () => {
            this._whitelistDialog.resetValues();
            this._whitelistDialog.setTitle('Whitelist Add');
            this._whitelistDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm');

        // -------------------------------------------------------------------------------------------------------------

        this._importBlacklistDialog.setOnSave(async(): Promise<void> => {
            let tid = this._importBlacklistDialog.getId();

            if (tid && tid > 0) {
                const entrie: IpAccessBlackListImportSaveRequest = {
                    id: tid,
                    disable: this._importBlacklistDialog.getDisable()
                };

                if (await IpAccessAPI.saveBlackListImport(entrie)) {
                    this._importBlacklistDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Import Blacklist save success.'
                    });
                } else {
                    this._toast.fire({
                        icon: 'error',
                        title: 'Import Blacklist faild.'
                    });
                }
            } else {
                console.log('Empty id by import blacklist dialog!');
            }
        });

        // -------------------------------------------------------------------------------------------------------------

        this._ownBlacklistDialog.setOnSave(async(): Promise<void> => {
            let tid = this._ownBlacklistDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const entry: IpAccessBlackListOwn = {
                    id: tid,
                    ip: this._ownBlacklistDialog.getIp(),
                    disable: this._ownBlacklistDialog.getDisable(),
                    description: this._ownBlacklistDialog.getDescription(),
                    ip_location_id: 0,
                    count_block: 0,
                    last_block: 0,
                    last_update: 0
                };

                if (await IpAccessAPI.saveBlackListOwn(entry)) {
                    this._ownBlacklistDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Blacklist save success.'
                    });
                }
            } catch ({message}) {
                this._toast.fire({
                    icon: 'error',
                    title: message
                });
            }
        });

        // -------------------------------------------------------------------------------------------------------------

        this._whitelistDialog.setOnSave(async(): Promise<void> => {
            let tid = this._whitelistDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const entry: IpAccessWhiteSaveRequest = {
                    id: tid,
                    ip: this._whitelistDialog.getIp(),
                    disable: this._whitelistDialog.getDisable(),
                    description: this._whitelistDialog.getDescription()
                };

                if (await IpAccessAPI.saveWhiteList(entry)) {
                    this._whitelistDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Whitelist save success.'
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

        const row = new ContentRow(content);
        const cardIpAccess = new Card(new ContentCol(row, ContentColSize.col12));
        cardIpAccess.setTitle('Lists');

        const mainTabs = new NavTab(cardIpAccess, 'ipaccesstabs');
        const tabBlacklist = mainTabs.addTab('Blacklist', 'ipaccesstabblacklist');
        const tabWhitelist = mainTabs.addTab('Whitelist', 'ipaccesstabwhitelist');

        tabBlacklist.body.addClass('dark-mode');

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

            // whitelist -----------------------------------------------------------------------------------------------
            tabWhitelist.body.empty();

            const tableW = new Table(tabWhitelist.body);
            const trheadW = new Tr(tableW.getThead());

            // eslint-disable-next-line no-new
            new Th(trheadW, 'IP', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadW, 'Last access<br><b>Count access</b>', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadW, 'Location info');

            // eslint-disable-next-line no-new
            new Th(trheadW, 'Description');

            // eslint-disable-next-line no-new
            new Th(trheadW, 'Last update', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadW, 'Disabled', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadW, 'Action');

            const whiteList = await IpAccessAPI.getWhiteList();

            if (whiteList) {
                const locationWList: Map<number, IpAccessLocation> = new Map<number, IpAccessLocation>();

                if (whiteList.locations) {
                    for (const loction of whiteList.locations) {
                        locationWList.set(loction.id, loction);
                    }
                }

                for (const bentry of whiteList.list!) {
                    const trbodyW = new Tr(tableW.getTbody());

                    const tdIp = new Td(trbodyW, '');

                    // eslint-disable-next-line no-new
                    new Badge(tdIp, `${bentry.ip}`, BadgeType.secondary);

                    const lastBlock = moment(bentry.last_access * 1000);

                    const tdaccess = new Td(trbodyW, `${lastBlock.format('YYYY-MM-DD HH:mm:ss')}<br>`);

                    // eslint-disable-next-line no-new
                    new Badge(tdaccess, `${bentry.count_access}`, BadgeType.success);

                    const loactionTd = new Td(trbodyW, 'none');

                    if (bentry.ip_location_id) {
                        const aLocation = locationWList.get(bentry.ip_location_id);

                        if (aLocation) {
                            const locationDiv = jQuery('<div class="attachment-block clearfix"></div>').appendTo(
                                loactionTd.getElement().empty()
                            );

                            locationDiv.append(`${aLocation.org ? aLocation.org : '?'}<br>`);
                            locationDiv.append(`${aLocation.city ? aLocation.city : '?'}, ${aLocation.postal_code}<br>`);
                            locationDiv.append(`${aLocation.country}<br>`);
                        }
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbodyW, `${bentry.description}`);

                    const lastUpdate = moment(bentry.last_update * 1000);

                    // eslint-disable-next-line no-new
                    new Td(trbodyW, `${lastUpdate.format('YYYY-MM-DD HH:mm:ss')}`);

                    // eslint-disable-next-line no-new
                    new Td(trbodyW, `${bentry.disable ? 'yes' : 'no'}`);

                    const tdAction = new Td(trbodyW, '');

                    const editBtn = new Button(tdAction, ButtonType.borderless);

                    // eslint-disable-next-line no-new
                    new Icon(editBtn.getElement(), IconFa.edit);

                    editBtn.setOnClickFn((): void => {
                        this._whitelistDialog.setTitle('Whitelist Edit');
                        this._whitelistDialog.resetValues();
                        this._whitelistDialog.setId(bentry.id);
                        this._whitelistDialog.setIp(bentry.ip);
                        this._whitelistDialog.setDisable(bentry.disable);
                        this._whitelistDialog.setDescription(bentry.description);
                        this._whitelistDialog.show();
                    });
                }
            }

            // own blacklist -------------------------------------------------------------------------------------------
            tabBlacklistOwn.body.empty();

            const tableO = new Table(tabBlacklistOwn.body);
            const trheadO = new Tr(tableO.getThead());

            // eslint-disable-next-line no-new
            new Th(trheadO, 'IP', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadO, 'Last block<br><b>Count blocks</b>', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadO, 'Location info');

            // eslint-disable-next-line no-new
            new Th(trheadO, 'Description');

            // eslint-disable-next-line no-new
            new Th(trheadO, 'Last update', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadO, 'Disabled', '150px');

            // eslint-disable-next-line no-new
            new Th(trheadO, 'Action');

            const blackListOwns = await IpAccessAPI.getBlackListOwns();

            if (blackListOwns) {
                const locationOList: Map<number, IpAccessLocation> = new Map<number, IpAccessLocation>();

                if (blackListOwns.locations) {
                    for (const loction of blackListOwns.locations) {
                        locationOList.set(loction.id, loction);
                    }
                }

                for (const bentry of blackListOwns.list!) {
                    const trbodyO = new Tr(tableO.getTbody());

                    const tdIp = new Td(trbodyO, '');

                    // eslint-disable-next-line no-new
                    new Badge(tdIp, `${bentry.ip}`, BadgeType.secondary);

                    const lastBlock = moment(bentry.last_block * 1000);

                    const tdblockOwn = new Td(trbodyO, `${lastBlock.format('YYYY-MM-DD HH:mm:ss')}<br>`);

                    // eslint-disable-next-line no-new
                    new Badge(tdblockOwn, `${bentry.count_block}`, BadgeType.success);

                    const loactionTd = new Td(trbodyO, 'none');

                    if (bentry.ip_location_id) {
                        const aLocation = locationOList.get(bentry.ip_location_id);

                        if (aLocation) {
                            const locationDiv = jQuery('<div class="attachment-block clearfix"></div>').appendTo(
                                loactionTd.getElement().empty()
                            );

                            locationDiv.append(`${aLocation.org ? aLocation.org : '?'}<br>`);
                            locationDiv.append(`${aLocation.city ? aLocation.city : '?'}, ${aLocation.postal_code}<br>`);
                            locationDiv.append(`${aLocation.country}<br>`);
                        }
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbodyO, `${bentry.description}`);

                    const lastUpdate = moment(bentry.last_update * 1000);

                    // eslint-disable-next-line no-new
                    new Td(trbodyO, `${lastUpdate.format('YYYY-MM-DD HH:mm:ss')}`);

                    // eslint-disable-next-line no-new
                    new Td(trbodyO, `${bentry.disable ? 'yes' : 'no'}`);

                    const tdAction = new Td(trbodyO, '');

                    const editBtn = new Button(tdAction, ButtonType.borderless);

                    // eslint-disable-next-line no-new
                    new Icon(editBtn.getElement(), IconFa.edit);

                    editBtn.setOnClickFn((): void => {
                        this._ownBlacklistDialog.setTitle('Blacklist Edit');
                        this._ownBlacklistDialog.resetValues();
                        this._ownBlacklistDialog.setId(bentry.id);
                        this._ownBlacklistDialog.setIp(bentry.ip);
                        this._ownBlacklistDialog.setDisable(bentry.disable);
                        this._ownBlacklistDialog.setDescription(bentry.description);
                        this._ownBlacklistDialog.show();
                    });
                }
            }

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

            const blackListImports = await IpAccessAPI.getBlackListImports();

            if (blackListImports) {
                const locationIList: Map<number, IpAccessLocation> = new Map<number, IpAccessLocation>();

                if (blackListImports.locations) {
                    for (const loction of blackListImports.locations) {
                        locationIList.set(loction.id, loction);
                    }
                }

                for (const bentry of blackListImports.list!) {
                    const trbodyB = new Tr(tableB.getTbody());

                    const tdIp = new Td(trbodyB, '');

                    // eslint-disable-next-line no-new
                    new Badge(tdIp, `${bentry.ip}`, BadgeType.secondary);

                    const lastBlock = moment(bentry.last_block * 1000);

                    const tdblockImport = new Td(trbodyB, `${lastBlock.format('YYYY-MM-DD HH:mm:ss')}<br>`);

                    // eslint-disable-next-line no-new
                    new Badge(tdblockImport, `${bentry.count_block}`, BadgeType.success);

                    const loactionTd = new Td(trbodyB, 'none');

                    if (bentry.ip_location_id) {
                        const aLocation = locationIList.get(bentry.ip_location_id);

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
                            // eslint-disable-next-line no-new
                            new Badge(tdMain, `${tMain.maintainer_name}`, BadgeType.primary);

                            tdMain.append('&nbsp;');
                        }
                    }

                    const lastUpdate = moment(bentry.last_update * 1000);

                    // eslint-disable-next-line no-new
                    new Td(trbodyB, `${lastUpdate.format('YYYY-MM-DD HH:mm:ss')}`);

                    // eslint-disable-next-line no-new
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