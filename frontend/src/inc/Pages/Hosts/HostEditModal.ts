import {InputBottemBorderOnly2} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
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
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'domainmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupDomainName = new FormGroup(bodyCard, 'Domain Name/IP');
        this._inputDomainName = new InputBottemBorderOnly2(groupDomainName.getElement());
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
}