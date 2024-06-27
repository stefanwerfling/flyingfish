import {Card, ContentCol, ContentColSize, ContentRow, Table, Th, Tr} from 'bambooo';
import {Credential} from 'flyingfish_schemas';
import {BasePage} from '../BasePage';

export class CredentialUsers extends BasePage {

    /**
     * name
     * @protected
     */
    protected override _name: string = 'credential';

    /**
     * Credential
     * @protected
     */
    protected _credential: Credential;

    /**
     * constructor
     */
    public constructor(credential: Credential) {
        super();

        this._credential = credential;

        this.setTitle(`Credential User-List: ${this._credential.name}`);
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));

        card.setTitle('Users');

        const table = new Table(card);
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Id');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Name');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Last');

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();
            table.getTbody().empty();


            card.hideLoading();
        };

        // load table
        await this._onLoadTable();
    }

}