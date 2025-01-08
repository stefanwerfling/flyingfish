import {
    FormGroup,
    InputBottemBorderOnly2,
    InputType,
    ModalDialog,
    ModalDialogType,
    Switch,
    Element, LangText
} from 'bambooo';

/**
 * Credential user edit modal
 */
export class CredentialUserEditModal extends ModalDialog {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input username
     * @protected
     */
    protected _inputUsername: InputBottemBorderOnly2;

    /**
     * input password
     * @protected
     */
    protected _inputPassword: InputBottemBorderOnly2;

    /**
     * input password repeat
     * @protected
     */
    protected _inputPasswordRepeat: InputBottemBorderOnly2;

    /**
     * switch disable
     * @protected
     */
    protected _switchDisable: Switch;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'credentialusermodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupUsername = new FormGroup(bodyCard, 'Username');
        this._inputUsername = new InputBottemBorderOnly2(groupUsername);

        const groupPassword = new FormGroup(bodyCard, 'Password');
        this._inputPassword = new InputBottemBorderOnly2(groupPassword, undefined, InputType.password);

        const groupPasswordRepeat = new FormGroup(bodyCard, 'Password repeat');
        this._inputPasswordRepeat = new InputBottemBorderOnly2(groupPasswordRepeat, undefined, InputType.password);

        const groupDisable = new FormGroup(bodyCard, 'Disable this User');
        this._switchDisable = new Switch(groupDisable, 'userdisable');

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);
    }

    /**
     * getId
     * @returns {number|null}
     */
    public getId(): number|null {
        return this._id;
    }

    /**
     * setId
     * @param {number} id
     */
    public setId(id: number): void {
        this._id = id;
    }

    /**
     * Return the username
     * @returns {string}
     */
    public getUsername(): string {
        return this._inputUsername.getValue();
    }

    /**
     * Set the username
     * @param {string} username
     */
    public setUsername(username: string): void {
        this._inputUsername.setValue(username);
    }

    /**
     * Return the password
     * @returns {string}
     */
    public getPassword(): string {
        return this._inputPassword.getValue();
    }

    /**
     * Set the password
     * @param {string} password
     */
    public setPassword(password: string): void {
        this._inputPassword.setValue(password);
    }

    /**
     * Return the password repeat
     * @returns {string}
     */
    public getPasswordRepeat(): string {
        return this._inputPasswordRepeat.getValue();
    }

    /**
     * Set the password repeat
     * @param {string} password
     */
    public setPasswordRepeat(password: string): void {
        this._inputPasswordRepeat.setValue(password);
    }

    /**
     * Is the user disabled
     * @returns {boolean}
     */
    public isDisabled(): boolean {
        return this._switchDisable.isEnable();
    }

    /**
     * Set the user disabled
     * @param {boolean} disable
     */
    public setDisabled(disable: boolean): void {
        this._switchDisable.setEnable(disable);
    }

    /**
     * Reset all input fields
     */
    public override resetValues(): void {
        super.resetValues();
        this._id = null;
        this.setUsername('');
        this.setPassword('');
        this.setPasswordRepeat('');
        this.setDisabled(false);
    }

}