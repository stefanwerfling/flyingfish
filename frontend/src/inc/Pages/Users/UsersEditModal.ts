import {
    Form,
    FormGroup,
    InputBottemBorderOnly2,
    InputType,
    Switch,
    Element,
    ModalDialog,
    ModalDialogType,
    LangText
} from 'bambooo';

/**
 * UsersEditModal
 */
export class UsersEditModal extends ModalDialog {

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
     * input email
     * @protected
     */
    protected _inputEmail: InputBottemBorderOnly2;

    /**
     * switch disable
     * @protected
     */
    protected _switchDisable: Switch;

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
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'usereditdialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"></div>').appendTo(this._body);
        const form = new Form(bodyCard);

        const groupUsername = new FormGroup(form, 'Username');
        this._inputUsername = new InputBottemBorderOnly2(groupUsername, 'username');

        const groupEMail = new FormGroup(form, 'EMail');
        this._inputEmail = new InputBottemBorderOnly2(groupEMail, 'email');

        const groupDisable = new FormGroup(bodyCard, 'Disable this user');
        this._switchDisable = new Switch(groupDisable, 'userdisable');

        const groupPassword = new FormGroup(bodyCard, 'Password');
        this._inputPassword = new InputBottemBorderOnly2(groupPassword, 'password', InputType.password);
        this._inputPassword.setPlaceholder('leave blank if you do not want to change it');

        const groupPasswordRepeat = new FormGroup(bodyCard, 'Password repeat');
        this._inputPasswordRepeat = new InputBottemBorderOnly2(groupPasswordRepeat, 'passwordreapt', InputType.password);
        this._inputPasswordRepeat.setPlaceholder('leave blank if you do not want to change it');

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);
    }

    /**
     * getId
     */
    public getId(): number|null {
        return this._id;
    }

    /**
     * setId
     * @param id
     */
    public setId(id: number|null): void {
        this._id = id;
    }

    /**
     * getUsername
     */
    public getUsername(): string {
        return this._inputUsername.getValue();
    }

    /**
     * setUsername
     * @param username
     */
    public setUsername(username: string): void {
        this._inputUsername.setValue(username);
    }

    /**
     * getEMail
     */
    public getEMail(): string {
        return this._inputEmail.getValue();
    }

    /**
     * setEMail
     * @param email
     */
    public setEMail(email: string): void {
        this._inputEmail.setValue(email);
    }

    /**
     * setDisable
     * @param disable
     */
    public setDisable(disable: boolean): void {
        this._switchDisable.setEnable(disable);
    }

    /**
     * getDisable
     */
    public getDisable(): boolean {
        return this._switchDisable.isEnable();
    }

    /**
     * setPassword
     * @param password
     */
    public setPassword(password: string): void {
        this._inputPassword.setValue(password);
    }

    /**
     * getPassword
     */
    public getPassword(): string {
        return this._inputPassword.getValue();
    }

    /**
     * setPasswordRepeat
     * @param repeat
     */
    public setPasswordRepeat(repeat: string): void {
        this._inputPasswordRepeat.setValue(repeat);
    }

    /**
     * getPasswordRepeat
     */
    public getPasswordRepeat(): string {
        return this._inputPasswordRepeat.getValue();
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this.setId(null);
        this.setUsername('');
        this.setEMail('');
        this.setDisable(false);
        this.setPassword('');
        this.setPasswordRepeat('');
    }

}