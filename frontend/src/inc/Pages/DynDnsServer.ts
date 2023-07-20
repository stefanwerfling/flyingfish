import {Card, ContentCol, ContentColSize, ContentRow, IconFa, LeftNavbarLink, Table, Th, Tr} from 'bambooo';
import {UnauthorizedError} from '../Api/Error/UnauthorizedError';
import {UtilRedirect} from '../Utils/UtilRedirect';
import {BasePage} from './BasePage';

/**
 * DynDnsServer
 */
export class DynDnsServer extends BasePage {

    /**
     * name
     * @protected
     */
    protected _name: string = 'dyndnsserver';

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('DynDns-Server');

        // -------------------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add User', async() => {
            /*this._dynDnsClientDialog.resetValues();
            this._dynDnsClientDialog.setTitle('DynDns Client Add');
            this._dynDnsClientDialog.show();*/
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        this._wrapper.getNavbar().getLeftNavbar().getElement().append('&nbsp;');
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());

        const card = new Card(new ContentCol(row1, ContentColSize.col12));

        card.setTitle('Accounts');

        const table = new Table(card);
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Id');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Domains');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Username');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Last-Update');

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();
            table.getTbody().empty();

            try {
                console.log('test');
            } catch (error) {
                if (error instanceof UnauthorizedError) {
                    UtilRedirect.toLogin();
                }
            }

            card.hideLoading();
        };

        // load table
        await this._onLoadTable();
    }

}