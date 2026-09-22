import {FfrField, FfrInput, FfrModal, FfrSection, FfrSwitch} from '../../Components/FfrModal.js';

/**
 * CredentialUserEditModal — add/edit a credential user (username + password + disable flag).
 * Rendered in the FlyingFish `.ffr` design language (see {@link FfrModal}): sectioned form with
 * plain inputs (there is no dedicated password widget) and a disable switch. Public API (get/set
 * per field + resetValues) is unchanged so the page is agnostic to the widget set.
 */
export class CredentialUserEditModal {

    /**
     * modal
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
     * switch disable
     * @protected
     */
    protected readonly _switchDisable: FfrSwitch;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('Credential User', 'Save changes');
        const body = this._modal.getBody();

        const secDetails = new FfrSection(body, 'Details');

        this._inputUsername = new FfrInput(false, 'Username');
        new FfrField(secDetails.element, 'Username').mount(this._inputUsername.element);

        this._inputPassword = new FfrInput(false, 'Password');
        this._inputPassword.element.attr('type', 'password');
        new FfrField(secDetails.element, 'Password').mount(this._inputPassword.element);

        this._inputPasswordRepeat = new FfrInput(false, 'Password repeat');
        this._inputPasswordRepeat.element.attr('type', 'password');
        new FfrField(secDetails.element, 'Password repeat').mount(this._inputPasswordRepeat.element);

        const secState = new FfrSection(body, 'State');
        this._switchDisable = new FfrSwitch('Disable this User', false);
        secState.element.append(this._switchDisable.element);
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
        return this._switchDisable.isOn();
    }

    /**
     * Set the user disabled
     * @param {boolean} disable
     */
    public setDisabled(disable: boolean): void {
        this._switchDisable.setOn(disable);
    }

    /**
     * Reset all input fields
     */
    public resetValues(): void {
        this._id = null;
        this.setUsername('');
        this.setPassword('');
        this.setPasswordRepeat('');
        this.setDisabled(false);
    }

}
