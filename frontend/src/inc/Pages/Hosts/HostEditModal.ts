import {SelectBottemBorderOnly2} from '../../Bambooo/Content/Form/SelectBottemBorderOnly2';
import {InputBottemBorderOnly2} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {NavTab} from '../../Bambooo/Content/Tab/NavTab';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';
import {Element} from '../../Bambooo/Element';

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

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(tabDetails);

        const groupDomainName = new FormGroup(bodyCard, 'Domain Name/IP');
        this._inputDomainName = new InputBottemBorderOnly2(groupDomainName.getElement());

        const groupListen = new FormGroup(bodyCard, 'Listen');
        this._selectListen = new SelectBottemBorderOnly2(groupListen.getElement());
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
     * getSelectListen
     */
    public getSelectListen(): SelectBottemBorderOnly2 {
        return this._selectListen;
    }
}