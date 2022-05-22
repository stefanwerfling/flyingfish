import {ListenData} from '../../Api/Listen';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {InputBottemBorderOnly2, InputType} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {SelectBottemBorderOnly2} from '../../Bambooo/Content/Form/SelectBottemBorderOnly2';
import {NavTab} from '../../Bambooo/Content/Tab/NavTab';
import {Element} from '../../Bambooo/Element';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * HostEditModal
 */
export class HostEditModal extends ModalDialog {

    /**
     * Domainname or IP
     * @protected
     */
    protected _inputDomainName: InputBottemBorderOnly2;

    /**
     * Listen
     * @protected
     */
    protected _selectListen: SelectBottemBorderOnly2;

    /**
     * Listens data
     * @protected
     */
    protected _listens: ListenData[] = [];

    /**
     * Index
     * @protected
     */
    protected _inputIndex: InputBottemBorderOnly2;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'domainmodaldialog', ModalDialogType.large);

        const navTab = new NavTab(this._body, 'domainnavtab');
        const tabDetails = navTab.addTab('Details', 'details');
        // @ts-ignore
        const tabSsl = navTab.addTab('SSL', 'ssl');
        // @ts-ignore
        const tabLocations = navTab.addTab('Locations', 'locations');
        // @ts-ignore
        const tabAdvanced = navTab.addTab('Advanced', 'advanced');

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(tabDetails.body);

        const groupDomainName = new FormGroup(bodyCard, 'Domain Name/IP');
        this._inputDomainName = new InputBottemBorderOnly2(groupDomainName.getElement());

        const groupListen = new FormGroup(bodyCard, 'Listen');
        this._selectListen = new SelectBottemBorderOnly2(groupListen.getElement());
        this._selectListen.setChangeFn((value) => {
            for (const listen of this._listens) {
                if (value === `${listen.id}`) {
                    switch (listen.type) {
                        case 0:
                            // stream
                            tabSsl.tab.hide();
                            tabLocations.tab.hide();
                            break;

                        case 1:
                            // http
                            tabSsl.tab.show();
                            tabLocations.tab.show();
                            break;
                    }
                }
            }
        });

        const groupIndex = new FormGroup(bodyCard, 'Index');
        this._inputIndex = new InputBottemBorderOnly2(groupIndex.getElement(), undefined, InputType.number);
    }

    /**
     * setDomainName
     * @param name
     */
    public setDomainName(name: string): void {
        this._inputDomainName.setValue(name);
    }

    /**
     * getDomainName
     */
    public getDomainName(): string {
        return this._inputDomainName.getValue();
    }

    /**
     * setListens
     * @param listens
     */
    public setListens(listens: ListenData[]): void {
        this._listens = listens;
        this._selectListen.clearValues();

        this._selectListen.addValue({
            key: '0',
            value: 'Please select your Listen'
        });

        for (const alisten of this._listens) {
            const type = alisten.type === 0 ? 'Stream' : 'HTTP';

            this._selectListen.addValue({
                key: `${alisten.id}`,
                value: `${alisten.name} - ${alisten.port} (${type})`,
                style: alisten.type === 0 ? 'background:#ffc107;' : 'background:#28a745;'
            });
        }
    }
}