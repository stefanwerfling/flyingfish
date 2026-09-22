import {DynDnsServerDomain, DynDnsServerNotInDomain} from 'flyingfish_schemas';
import {FfrField, FfrInput, FfrModal, FfrSection, FfrSwitch} from '../../Components/FfrModal.js';

/**
 * DynDnsServerEditModal — add/edit a DynDns server account (username + password + the set of
 * domains the account may update). Rendered in the FlyingFish `.ffr` design language (see
 * {@link FfrModal}): sectioned form, mono-free inputs and one {@link FfrSwitch} per selectable
 * domain (the `.ffr` set has no multi-select, so the domain multi-choice is expressed as a list
 * of toggles). Public API (get/set per field + resetValues) is unchanged so the page is agnostic
 * to the widget set.
 */
export class DynDnsServerEditModal {

    /**
     * The underlying `.ffr` modal.
     * @member {FfrModal}
     */
    protected readonly _modal: FfrModal;

    /**
     * ID of entry.
     * @member {number|null}
     */
    protected _id: number|null = null;

    /**
     * Input username.
     * @member {FfrInput}
     */
    protected readonly _inputUsername: FfrInput;

    /**
     * Input password.
     * @member {FfrInput}
     */
    protected readonly _inputPassword: FfrInput;

    /**
     * The container holding one switch per selectable domain.
     * @member {JQuery}
     */
    protected readonly _domainsList: JQuery;

    /**
     * The domain toggles, keyed by domain id (as string).
     * @member {Map<string, FfrSwitch>}
     */
    protected readonly _domainSwitches: Map<string, FfrSwitch> = new Map<string, FfrSwitch>();

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('DynDns Server', 'Save changes');
        const body = this._modal.getBody();

        // account ----------------------------------------------------------------------------------------------------
        const secAccount = new FfrSection(body, 'Account');

        const rowCreds = FfrField.row(secAccount.element);

        this._inputUsername = new FfrInput(false, 'Username');
        new FfrField(rowCreds, 'Username').mount(this._inputUsername.element);

        this._inputPassword = new FfrInput(false, '');
        this._inputPassword.element.attr('type', 'password');
        new FfrField(rowCreds, 'Password').mount(this._inputPassword.element);

        // domains ----------------------------------------------------------------------------------------------------
        const secDomains = new FfrSection(body, 'Domains');
        this._domainsList = jQuery('<div></div>').appendTo(secDomains.element);
    }

    /**
     * Add (or reuse) a switch for a single domain.
     * @param key - the domain id (as string)
     * @param name - the domain name (switch label)
     * @returns {FfrSwitch} the switch for this domain
     * @protected
     */
    protected _ensureDomainSwitch(key: string, name: string): FfrSwitch {
        const existing = this._domainSwitches.get(key);

        if (existing !== undefined) {
            return existing;
        }

        const aSwitch = new FfrSwitch(name, false);
        this._domainSwitches.set(key, aSwitch);
        this._domainsList.append(aSwitch.element);

        return aSwitch;
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
     * setDomains
     * @param domains
     */
    public setDomains(domains: DynDnsServerNotInDomain[]): void {
        this._domainSwitches.clear();
        this._domainsList.empty();

        for (const domain of domains) {
            this._ensureDomainSwitch(`${domain.id}`, domain.name);
        }
    }

    /**
     * setId
     * @param id
     */
    public setId(id: number): void {
        if (id > 0) {
            this._inputPassword.element.attr('placeholder', 'Leave password blank if you don\'t want to change the password.');
        } else {
            this._inputPassword.element.attr('placeholder', '');
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
        for (const domain of domains) {
            const aSwitch = this._ensureDomainSwitch(`${domain.id}`, domain.name);
            aSwitch.setOn(true);
        }
    }

    /**
     * getDomainSelected
     */
    public getDomainSelected(): DynDnsServerDomain[] {
        const list: DynDnsServerDomain[] = [];

        for (const [key, aSwitch] of this._domainSwitches) {
            if (aSwitch.isOn()) {
                list.push({
                    id: parseInt(key, 10),
                    name: ''
                });
            }
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
    public resetValues(): void {
        for (const [, aSwitch] of this._domainSwitches) {
            aSwitch.setOn(false);
        }

        this._inputUsername.setValue('');
        this._inputPassword.setValue('');
    }

}
