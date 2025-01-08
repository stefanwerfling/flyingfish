import {
    Element,
    FormGroup,
    InputBottemBorderOnly2,
    InputType,
    LangText,
    ModalDialog,
    ModalDialogType,
    Multiple
} from 'bambooo';
import {DynDnsServerDomain, DynDnsServerNotInDomain} from 'flyingfish_schemas';

/**
 * DynDns Server Edit Modal
 */
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

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);
    }

    /**
     * setDomains
     * @param domains
     */
    public setDomains(domains: DynDnsServerNotInDomain[]): void {
        this._multipleDomains.clearValues();

        for (const domain of domains) {
            this._multipleDomains.addValue({
                key: `${domain.id}`,
                value: domain.name
            });
        }
    }

    /**
     * setId
     * @param id
     */
    public setId(id: number): void {
        if (id > 0) {
            this._inputPassword.setPlaceholder('Leave password blank if you don\'t want to change the password.');
        } else {
            this._inputPassword.setPlaceholder('');
        }

        this._id = id;
    }

    /**
     * getId
     */
    public getId(): number|null {
        return this._id;
    }

    /**
     * setDomainSelected
     * @param domains
     */
    public setDomainSelected(domains: DynDnsServerDomain[]): void {
        const list: string[] = [];

        for (const domain of domains) {
            list.push(`${domain.id}`);
            this._multipleDomains.addValue({
                key: `${domain.id}`,
                value: domain.name
            });
        }

        this._multipleDomains.setValue(list);
    }

    /**
     * getDomainSelected
     */
    public getDomainSelected(): DynDnsServerDomain[] {
        const list: DynDnsServerDomain[] = [];

        const values = this._multipleDomains.getValue();

        for (const value of values) {
            list.push({
                id: parseInt(value, 10),
                name: ''
            });
        }

        return list;
    }

    /**
     * setUsername
     * @param username
     */
    public setUsername(username: string): void {
        this._inputUsername.setValue(username);
    }

    /**
     * getUsername
     */
    public getUsername(): string {
        return this._inputUsername.getValue();
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
     * resetValues
     */
    public override resetValues(): void {
        this._multipleDomains.setValue([]);
        this._inputUsername.setValue('');
        this._inputPassword.setValue('');
    }

}