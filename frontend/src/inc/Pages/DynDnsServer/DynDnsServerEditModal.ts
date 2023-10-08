import {Element, FormGroup, InputBottemBorderOnly2, InputType, ModalDialog, ModalDialogType, Multiple} from 'bambooo';

export class DynDnsServerEditModal extends ModalDialog {

    /**
     * ID of entry.
     * @member {number|null}
     */
    protected _id: number|null = null;

    /**
     * Input username.
     * @member {InputBottemBorderOnly2}
     */
    protected _inputUsername: InputBottemBorderOnly2;

    /**
     * Input password.
     * @member {InputBottemBorderOnly2}
     */
    protected _inputPassword: InputBottemBorderOnly2;

    /**
     * multiple domains
     * @member {Multiple}
     */
    protected _multipleDomains: Multiple;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'dyndnsservermodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupUsername = new FormGroup(bodyCard, 'Username');
        this._inputUsername = new InputBottemBorderOnly2(groupUsername);

        const groupPassword = new FormGroup(bodyCard, 'Password');
        this._inputPassword = new InputBottemBorderOnly2(groupPassword, undefined, InputType.password);

        const groupDomains = new FormGroup(bodyCard, 'Domains');
        this._multipleDomains = new Multiple(groupDomains);
        groupDomains.hide();
    }

}