import {Element} from '../../PageComponents/Element';
import {ModalDialog, ModalDialogType} from '../../PageComponents/Modal/ModalDialog';

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