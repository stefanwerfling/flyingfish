import {ModalDialog, ModalDialogType, Element} from '../../Bambooo';

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