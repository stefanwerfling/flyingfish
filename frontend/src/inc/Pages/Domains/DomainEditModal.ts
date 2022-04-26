import {Element, ModalDialog, ModalDialogType} from 'bambooo';

/**
 * DomainEditModal
 */
export class DomainEditModal extends ModalDialog {

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'domainmodaldialog', ModalDialogType.large);
    }

}