import {DomainData, DynDnsClientDomain, GatewayIdentifierEntry, ProviderEntry} from 'flyingfish_schemas';
import {FfrField, FfrInput, FfrModal, FfrSection, FfrSelect, FfrSwitch} from '../../Components/FfrModal.js';
import {Lang} from '../../Lang.js';

/**
 * DynDnsClientEditModal — add/edit a DynDNS client (provider credentials, the bound gateway
 * and the domains to update). Rendered in the FlyingFish `.ffr` design language (see
 * {@link FfrModal}): sectioned form, styled selects, switch. The update-domains multi-select
 * shows only when "update domains" is enabled. The public API (get/set per field +
 * resetValues) is unchanged so the page is agnostic to the widget set.
 */
export class DynDnsClientEditModal {

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
     * select provider
     * @protected
     */
    protected readonly _selectProvider: FfrSelect;

    /**
     * select main domain
     * @protected
     */
    protected readonly _selectMainDomain: FfrSelect;

    /**
     * select update domains (native multi-select)
     * @protected
     */
    protected readonly _selectDomains: FfrSelect;

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
     * switch update domains
     * @protected
     */
    protected readonly _switchUpdateDomains: FfrSwitch;

    /**
     * select gateway identifier
     * @protected
     */
    protected readonly _selectGatewayIdentifier: FfrSelect;

    /**
     * The update-domains field wrapper (shown only when the switch is on).
     * @protected
     */
    protected readonly _fieldDomains: FfrField;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('DynDns Client', 'Save changes');
        const body = this._modal.getBody();

        // provider ---------------------------------------------------------------------------------------------------
        const secProvider = new FfrSection(body, 'Provider');

        this._selectProvider = new FfrSelect();
        this._selectProvider.setValues([{
            key: 'none',
            value: 'Please select your provider'
        }]);
        this._selectProvider.setSelectedValue('none');
        new FfrField(secProvider.element, 'Provider').mount(this._selectProvider.element);

        this._inputUsername = new FfrInput(false);
        new FfrField(secProvider.element, 'Username').mount(this._inputUsername.element);

        this._inputPassword = new FfrInput(false);
        this._inputPassword.element.attr('type', 'password');
        new FfrField(secProvider.element, 'Password').mount(this._inputPassword.element);

        // domain / gateway -------------------------------------------------------------------------------------------
        const secDomain = new FfrSection(body, 'Domain');

        this._selectMainDomain = new FfrSelect();
        new FfrField(secDomain.element, 'Main Domain').mount(this._selectMainDomain.element);

        this._selectGatewayIdentifier = new FfrSelect();
        new FfrField(
            secDomain.element,
            'Gateway network assignment',
            Lang.i().l('dyndns_client_edit_gateway')
        ).mount(this._selectGatewayIdentifier.element);

        // update domains ---------------------------------------------------------------------------------------------
        const secUpdate = new FfrSection(body, 'Update Domains');

        this._switchUpdateDomains = new FfrSwitch('Enable update Domains', false);
        new FfrField(secUpdate.element, '', Lang.i().l('dyndns_client_edit_updatedomains')).mount(this._switchUpdateDomains.element);

        this._selectDomains = new FfrSelect();
        this._selectDomains.element.attr('multiple', 'multiple');
        this._fieldDomains = new FfrField(secUpdate.element, 'Update Domains').mount(this._selectDomains.element);
        this._fieldDomains.element.hide();
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
     * setProviders
     * @param {ProviderEntry[]} providers
     */
    public setProviders(providers: ProviderEntry[]): void {
        const options: {key: string; value: string;}[] = [{
            key: 'none',
            value: 'without'
        }];

        for (const provider of providers) {
            options.push({
                key: provider.name,
                value: provider.title
            });
        }

        this._selectProvider.setValues(options);
        this._selectProvider.setSelectedValue('none');
    }

    /**
     * setProvider
     * @param providerName
     */
    public setProvider(providerName: string): void {
        this._selectProvider.setSelectedValue(providerName);
    }

    /**
     * getProvider
     */
    public getProvider(): string {
        return this._selectProvider.getSelectedValue();
    }

    /**
     * Set domains for select
     * @param {DomainData[]} domains
     */
    public setDomains(domains: DomainData[]): void {
        const options: {key: string; value: string;}[] = [];

        for (const domain of domains) {
            options.push({
                key: `${domain.id}`,
                value: domain.name
            });
        }

        this._selectDomains.setValues(options);
    }

    /**
     * Set main domains for select
     * @param {DomainData[]} domains
     */
    public setMainDomains(domains: DomainData[]): void {
        const options: {key: string; value: string;}[] = [];

        for (const domain of domains) {
            options.push({
                key: `${domain.id}`,
                value: domain.name
            });
        }

        this._selectMainDomain.setValues(options);
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
     * Return the id
     * @returns {number|null}
     */
    public getId(): number|null {
        return this._id;
    }

    /**
     * Set domains selected
     * @param {DynDnsClientDomain[]} domains
     */
    public setDomainsSelected(domains: DynDnsClientDomain[]): void {
        const list: string[] = [];

        for (const domain of domains) {
            list.push(`${domain.id}`);
        }

        this._selectDomains.element.val(list);
    }

    /**
     * Get domains selected
     * @returns {DynDnsClientDomain[]}
     */
    public getDomainsSelected(): DynDnsClientDomain[] {
        const list: DynDnsClientDomain[] = [];

        const values = (this._selectDomains.element.val() as string[] | null) ?? [];

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
     * setUpdateDomains
     * @param update
     */
    public setUpdateDomains(update: boolean): void {
        this._switchUpdateDomains.setOn(update);
        this._fieldDomains.element.toggle(update);
    }

    /**
     * getUpdateDomains
     */
    public getUpdateDomains(): boolean {
        return this._switchUpdateDomains.isOn();
    }

    /**
     * Set the main domain selected
     * @param {number} domainId
     */
    public setMainDomainSelected(domainId: number): void {
        this._selectMainDomain.setSelectedValue(`${domainId}`);
    }

    /**
     * Return the main domain selected
     * @returns {number}
     */
    public getMainDomainSelected(): number {
        return parseInt(this._selectMainDomain.getSelectedValue(), 10) || 0;
    }

    /**
     * setGatewayIdentifiers
     * @param list
     */
    public setGatewayIdentifiers(list: GatewayIdentifierEntry[]): void {
        const options: {key: string; value: string;}[] = [{
            key: '0',
            value: 'Please select your Listen'
        }];

        for (const aGatewayIdentiefer of list) {
            options.push({
                key: `${aGatewayIdentiefer.id}`,
                value: aGatewayIdentiefer.networkname
            });
        }

        this._selectGatewayIdentifier.setValues(options);
    }

    /**
     * setGatewayIdentifier
     * @param gatewayIdentifier
     */
    public setGatewayIdentifier(gatewayIdentifier: number): void {
        this._selectGatewayIdentifier.setSelectedValue(`${gatewayIdentifier}`);
    }

    /**
     * getGatewayIdentifier
     */
    public getGatewayIdentifier(): number {
        return parseInt(this._selectGatewayIdentifier.getSelectedValue(), 10) || 0;
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setProvider('none');
        this._id = null;
        this.setGatewayIdentifier(0);
        this._selectMainDomain.setSelectedValue('');
        this._selectDomains.element.val([]);
        this.setUpdateDomains(false);
        this._inputUsername.setValue('');
        this._inputPassword.setValue('');
    }

}
