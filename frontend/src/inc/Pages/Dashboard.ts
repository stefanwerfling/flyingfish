import {Dashboard as DashboardApi} from '../Api/Dashboard';
import {Badge, BadgeType, InfoBox, InfoBoxBg, Card, ContentCol, ContentColSize, ContentRow, ButtonType, ButtonMenu, ButtonMenuPosition, IconFa} from 'bambooo';
import {BasePage} from './BasePage';
import {DashboardMapIp} from './Dashboard/DashboardMapIp';

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
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Dashboard');
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
        };

        // load table
        await this._onLoadTable();
    }

}