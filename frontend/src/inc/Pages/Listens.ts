import {Listen as ListenAPI, ListenTypes} from '../Api/Listen';
import {Badge, BadgeType} from '../Bambooo/Content/Badge/Badge';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol12} from '../Bambooo/Content/ContentCol12';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {Button} from '../Bambooo/Content/Form/Button';
import {Icon, IconFa} from '../Bambooo/Content/Icon/Icon';
import {Table} from '../Bambooo/Content/Table/Table';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {BasePage} from './BasePage';
import {ListensEditModal} from './Listens/ListensEditModal';

/**
 * Listens
 */
export class Listens extends BasePage {

    /**
     * listen dialog
     * @protected
     */
    protected _listenDialog: ListensEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        // route modal -------------------------------------------------------------------------------------------------

        this._listenDialog = new ListensEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Listens', () => {
            this._listenDialog.setTitle('Listen Add');
            this._listenDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm');

        this._wrapper.getNavbar().getLeftNavbar().getElement().append('&nbsp;');
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol12(row1));

        card.setTitle('Listens');

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Id');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Port');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Type');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Name');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Description');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Options');

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        /**
         * onLoadList
         */
        const onLoadList = async(): Promise<void> => {
            card.showLoading();
            table.getTbody().empty();

            const listens = await ListenAPI.getListens();

            if (listens) {
                card.setTitle(`Listens (${listens.list.length})`);

                for (const entry of listens.list) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${entry.id}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.port}`);

                    const typeTd = new Td(trbody, '');
                    const typeDiv = jQuery('<div/>').appendTo(typeTd.getElement());

                    if (entry.type === ListenTypes.stream) {
                        // eslint-disable-next-line no-new
                        new Badge(typeDiv, 'Stream', BadgeType.warning);
                    } else {
                        new Badge(typeDiv, 'HTTP/HTTPS', BadgeType.success);
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.name}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.description}`);

                    let options = '';

                    if (entry.enable_ipv6) {
                        if (options !== '') {
                            options += ', ';
                        }

                        options += 'IP6';
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${options}`);

                    const tdAction = new Td(trbody, '');

                    const editBtn = new Button(tdAction.getElement());
                    // eslint-disable-next-line no-new
                    new Icon(editBtn.getElement(), IconFa.edit);

                    editBtn.setOnClickFn((): void => {
                        this._listenDialog.setTitle('Listen Edit');
                        this._listenDialog.setName(entry.name);
                        this._listenDialog.setType(`${entry.type}`);
                        this._listenDialog.setPort(`${entry.port}`);
                        this._listenDialog.show();
                    });
                }
            }

            card.hideLoading();
        };


        // load table
        await onLoadList();
    }

}