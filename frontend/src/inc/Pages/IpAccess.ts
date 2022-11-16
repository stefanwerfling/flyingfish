import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol, ContentColSize} from '../Bambooo/Content/ContentCol';
import {ContentRow} from '../Bambooo/Content/ContentRow';
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

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {

        }

        // load table
        await this._onLoadTable();
    }
}