import {
    Badge,
    BadgeType,
    ButtonMenu,
    ButtonMenuPosition,
    ButtonType,
    Card,
    Circle,
    CircleColor,
    ContentCol,
    ContentColSize,
    ContentRow,
    IconFa,
    InfoBox,
    InfoBoxBg,
    LeftNavbarLink,
    SwitchTimer, Tooltip, TooltipInfo
} from 'bambooo';
import {Dashboard as DashboardApi} from '../Api/Dashboard';
import {Lang} from '../Lang';
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

        const row = new ContentRow(content);
        const col1 = new ContentCol(row, ContentColSize.col12ColSm6ColMd3);

        // public ip
        const pubIpBox = new InfoBox(col1, InfoBoxBg.none);
        pubIpBox.setIcon(IconFa.ethernet, InfoBoxBg.success);
        pubIpBox.getTextElement().append('Public IP');

        const col2 = new ContentCol(row, ContentColSize.col12ColSm6ColMd3);

        // gateway ip
        const gatewayIpBox = new InfoBox(col2, InfoBoxBg.none);
        gatewayIpBox.setIcon(IconFa.ethernet, InfoBoxBg.info);
        gatewayIpBox.getTextElement().append('Gateway IP');

        const col3 = new ContentCol(row, ContentColSize.col12ColSm6ColMd3);

        // host ip
        const hostIpBox = new InfoBox(col3, InfoBoxBg.none);
        hostIpBox.setIcon(IconFa.ethernet, InfoBoxBg.warning);
        hostIpBox.getTextElement().append('Host IP');

        // ip access map -------------------------------------------------------------------------------------------

        const rowMap = new ContentRow(content);
        const cardMap = new Card(new ContentCol(rowMap, ContentColSize.colMd8));
        cardMap.setTitle('IP Map/Blacklist');

        // @ts-ignore
        const dmip = new DashboardMapIp(cardMap);

        const mapContentInfo = new ContentCol(rowMap, ContentColSize.colMd4);
        const infoBoxBlocks = new InfoBox(mapContentInfo, InfoBoxBg.none);
        infoBoxBlocks.setIcon(IconFa.ban, InfoBoxBg.light);
        infoBoxBlocks.getTextElement().append('Blocks');

        const infoBoxPubIpBlacklist = new InfoBox(mapContentInfo, InfoBoxBg.none);
        infoBoxPubIpBlacklist.setIcon(IconFa.ethernet, InfoBoxBg.success);
        infoBoxPubIpBlacklist.getTextElement().append('Public IP blacklist check');

        // eslint-disable-next-line no-new
        new TooltipInfo(infoBoxPubIpBlacklist.getTextElement(), Lang.i().l('dahsboard_ip_blacklisted'));


        // init tooltips
        Tooltip.init();

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            const dashboardInfo = await DashboardApi.getInfo();

            // public ip -----------------------------------------------------------------------------------------------

            if (dashboardInfo !== null && dashboardInfo.public_ip !== null) {
                pubIpBox.getNumberElement().empty();

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

            // gateway ip ----------------------------------------------------------------------------------------------

            if (dashboardInfo !== null && dashboardInfo.host !== null) {
                gatewayIpBox.getNumberElement().empty();

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

            // host ip -------------------------------------------------------------------------------------------------

            if (dashboardInfo !== null && dashboardInfo.host !== null) {
                hostIpBox.getNumberElement().empty();

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

            // ip infos ------------------------------------------------------------------------------------------------

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

            // ip blocks -----------------------------------------------------------------------------------------------

            const ipblockCounts = dashboardInfo ? dashboardInfo.ipblock_count : 0;

            infoBoxBlocks.getNumberElement().empty().append(ipblockCounts);

            // ip checks -----------------------------------------------------------------------------------------------

            if (dashboardInfo) {
                infoBoxPubIpBlacklist.getNumberElement().empty();

                // eslint-disable-next-line no-new
                new Circle(infoBoxPubIpBlacklist.getNumberElement(), dashboardInfo.public_ip_blacklisted ? CircleColor.red : CircleColor.green);
                infoBoxPubIpBlacklist.getNumberElement().append(`&nbsp;${dashboardInfo.public_ip_blacklisted ? 'IP is blacklisted' : 'IP is not blacklisted'}`);
            }
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