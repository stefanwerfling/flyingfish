import {Card, CardBodyType} from '../Bambooo/Content/Card/Card';
import {ContentCol, ContentColSize} from '../Bambooo/Content/ContentCol';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {NavTab} from '../Bambooo/Content/Tab/NavTab';
import {BasePage} from './BasePage';

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
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('IP Access');
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();

        const row = new ContentRow(content);
        const cardIpAccess = new Card(new ContentCol(row, ContentColSize.col12));
        cardIpAccess.setTitle('IpAccess');

        const mainTabs = new NavTab(cardIpAccess.getElement(), 'ipaccesstabs');
        const tabBlacklist = mainTabs.addTab('Blacklist', 'ipaccesstabblacklist');

        const blacklistbodyCard = jQuery('<div class="card-body"/>').appendTo(tabBlacklist.body);
        const blacklistCard = new Card(blacklistbodyCard, CardBodyType.none);




        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            blacklistCard.getElement().empty();


        }

        // load table
        await this._onLoadTable();
    }
}