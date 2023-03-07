import {
    Badge,
    BadgeType,
    ButtonMenu,
    ButtonMenuPosition,
    ButtonType,
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    IconFa,
    InfoBox,
    InfoBoxBg, LeftNavbarLink, SwitchTimer
} from 'bambooo';
import {Dashboard as DashboardApi} from '../Api/Dashboard';
import {BasePage} from './BasePage';
import {DashboardMapIp, DashboardMapIpMark} from './Dashboard/DashboardMapIp';

/**
 * Dashboard
 */
export class Dashboard extends BasePage {

    /**
     * name
     * @protected
     */
    protected _name: string = 'dashboard';

    /**
     * switch timer
     * @protected
     */
    protected _updateSwitch: SwitchTimer;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Dashboard');

        const switchNav = new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), '', null);
        this._updateSwitch = new SwitchTimer(
            switchNav.getAElement(),
            'autoUpdate',
            30,
            'Update'
        );

        this._updateSwitch.setEnable(true);
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

            const dashboardInfo = await DashboardApi.getInfo();

            // ip infos ------------------------------------------------------------------------------------------------

            const row = new ContentRow(content);
            const col1 = new ContentCol(row, ContentColSize.col12ColSm6ColMd3);

            // public ip
            const pubIpBox = new InfoBox(col1, InfoBoxBg.none);
            pubIpBox.setIcon(IconFa.ethernet, InfoBoxBg.success);
            pubIpBox.getTextElement().append('Public IP');

            if (dashboardInfo !== null && dashboardInfo.public_ip !== null) {
                const btnPubIp = new ButtonMenu(
                    pubIpBox.getNumberElement(),
                    null,
                    true,
                    ButtonType.borderless,
                    ButtonMenuPosition.none
                );

                // eslint-disable-next-line no-new
                new Badge(btnPubIp, `${dashboardInfo.public_ip}`, BadgeType.secondary);

                btnPubIp.addMenuItem('Copy to clipboard', () => {
                    navigator.clipboard.writeText(dashboardInfo.public_ip!);

                    this._toast.fire({
                        icon: 'success',
                        title: 'IP copy to clipboard'
                    });

                }, IconFa.copy);
            }

            const col2 = new ContentCol(row, ContentColSize.col12ColSm6ColMd3);

            // gateway ip
            const gatewayIpBox = new InfoBox(col2, InfoBoxBg.none);
            gatewayIpBox.setIcon(IconFa.ethernet, InfoBoxBg.info);
            gatewayIpBox.getTextElement().append('Gateway IP');

            if (dashboardInfo !== null && dashboardInfo.host !== null) {
                const btnGateway = new ButtonMenu(
                    gatewayIpBox.getNumberElement(),
                    null,
                    true,
                    ButtonType.borderless,
                    ButtonMenuPosition.none
                );

                // eslint-disable-next-line no-new
                new Badge(btnGateway, `${dashboardInfo.host.gateway}`, BadgeType.secondary);

                btnGateway.addMenuItem('Copy to clipboard', () => {
                    navigator.clipboard.writeText(dashboardInfo.host!.gateway);

                    this._toast.fire({
                        icon: 'success',
                        title: 'IP copy to clipboard'
                    });

                }, IconFa.copy);
            }

            const col3 = new ContentCol(row, ContentColSize.col12ColSm6ColMd3);

            // host ip
            const hostIpBox = new InfoBox(col3, InfoBoxBg.none);
            hostIpBox.setIcon(IconFa.ethernet, InfoBoxBg.warning);
            hostIpBox.getTextElement().append('Host IP');

            if (dashboardInfo !== null && dashboardInfo.host !== null) {
                const btnHostIp = new ButtonMenu(
                    hostIpBox.getNumberElement(),
                    null,
                    true,
                    ButtonType.borderless,
                    ButtonMenuPosition.none
                );

                // eslint-disable-next-line no-new
                new Badge(btnHostIp, `${dashboardInfo.host.hostip}`, BadgeType.secondary);

                btnHostIp.addMenuItem('Copy to clipboard', () => {
                    navigator.clipboard.writeText(dashboardInfo.host!.hostip);

                    this._toast.fire({
                        icon: 'success',
                        title: 'IP copy to clipboard'
                    });

                }, IconFa.copy);
            }

            // ip access map -------------------------------------------------------------------------------------------

            const rowMap = new ContentRow(content);
            const cardMap = new Card(new ContentCol(rowMap, ContentColSize.colMd8));
            cardMap.setTitle('IP Map/Blacklist');

            // @ts-ignore
            const dmip = new DashboardMapIp(cardMap);

            const blockMarkList: DashboardMapIpMark[] = [];

            if (dashboardInfo) {
                for (const block of dashboardInfo.ipblocks) {
                    blockMarkList.push({
                        latitude: block.latitude,
                        longitude: block.longitude
                    });
                }
            }

            dmip.setMarks(blockMarkList);

            const mapContentInfo = new ContentCol(rowMap, ContentColSize.colMd4);
            const infoBoxBlocks = new InfoBox(mapContentInfo, InfoBoxBg.none);
            infoBoxBlocks.setIcon(IconFa.ban, InfoBoxBg.light);
            infoBoxBlocks.getTextElement().append('Blocks');

            const ipblockCounts = dashboardInfo ? dashboardInfo.ipblock_count : 0;

            infoBoxBlocks.getNumberElement().append(ipblockCounts);

        };

        // load table
        await this._onLoadTable();

        this._updateSwitch.setTimeoutFn(async() => {
            await this._onLoadTable();
        });
    }

    /**
     * unloadContent
     */
    public unloadContent(): void {
        this._updateSwitch.setEnable(false);
    }

}