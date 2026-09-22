import {FfrField, FfrInput, FfrModal, FfrSection, FfrSwitch} from '../../Components/FfrModal.js';

/**
 * UsersEditModal — add/edit a user (username + email + optional password change). Rendered in
 * the FlyingFish `.ffr` design language (see {@link FfrModal}): sectioned form, text inputs and
 * a switch. The password fields use plain text inputs (no dedicated password widget in the
 * `.ffr` set, which is acceptable here). Public API (get/set per field + resetValues) is
 * unchanged so the page is agnostic to the widget set.
 */
export class UsersEditModal {

    /**
     * The underlying `.ffr` modal.
     * @protected
     */
    protected readonly _modal: FfrModal;

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input username
     * @protected
     */
    protected readonly _inputUsername: FfrInput;

    /**
     * input email
     * @protected
     */
    protected readonly _inputEmail: FfrInput;

    /**
     * switch disable
     * @protected
     */
    protected readonly _switchDisable: FfrSwitch;

    /**
     * input password
     * @protected
     */
    protected readonly _inputPassword: FfrInput;

    /**
     * input password repeat
     * @protected
     */
    protected readonly _inputPasswordRepeat: FfrInput;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('User', 'Save changes');
        const body = this._modal.getBody();

        // account ----------------------------------------------------------------------------------------------------
        const secAccount = new FfrSection(body, 'Account');

        this._inputUsername = new FfrInput(false, 'username');
        new FfrField(secAccount.element, 'Username').mount(this._inputUsername.element);

        this._inputEmail = new FfrInput(false, 'email');
        new FfrField(secAccount.element, 'EMail').mount(this._inputEmail.element);

        this._switchDisable = new FfrSwitch('Disable this user', false);
        secAccount.element.append(this._switchDisable.element);

        // password ---------------------------------------------------------------------------------------------------
        const secPassword = new FfrSection(body, 'Password');

        this._inputPassword = new FfrInput(false, 'leave blank if you do not want to change it');
        this._inputPassword.element.attr('type', 'password');
        new FfrField(secPassword.element, 'Password').mount(this._inputPassword.element);

        this._inputPasswordRepeat = new FfrInput(false, 'leave blank if you do not want to change it');
        this._inputPasswordRepeat.element.attr('type', 'password');
        new FfrField(secPassword.element, 'Password repeat').mount(this._inputPasswordRepeat.element);
    }

    /**
     * setTitle
     * @param text - dialog title
     */
    public setTitle(text: string): void {
        this._modal.setTitle(text);
    }

    /**
     * setOnSave
     * @param fn - save handler
     */
    public setOnSave(fn: () => void): void {
        this._modal.setOnSave(fn);
    }

    /**
     * show
     */
    public show(): void {
        this._modal.show();
    }

    /**
     * hide
     */
    public hide(): void {
        this._modal.hide();
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
        this._switchDisable.setOn(disable);
    }

    /**
     * getDisable
     */
    public getDisable(): boolean {
        return this._switchDisable.isOn();
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
    public resetValues(): void {
        this.setId(null);
        this.setUsername('');
        this.setEMail('');
        this.setDisable(false);
        this.setPassword('');
        this.setPasswordRepeat('');
    }

}
