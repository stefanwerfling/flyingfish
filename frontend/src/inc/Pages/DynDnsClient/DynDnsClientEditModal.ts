import {DomainData, DynDnsClientDomain, GatewayIdentifierEntry, ProviderEntry} from 'flyingfish_schemas';
import {
    FormGroup, FormRow, InputBottemBorderOnly2, InputType, Multiple, SelectBottemBorderOnly2, Switch, Element,
    ModalDialog, ModalDialogType, LangText, TooltipInfo, Tooltip
} from 'bambooo';
import {Lang} from '../../Lang.js';

/**
 * DynDnsClientEditModal
 */
export class DynDnsClientEditModal extends ModalDialog {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * select provider
     * @protected
     */
    protected _selectProvider: SelectBottemBorderOnly2;

    /**
     * multiple main domain
     * @protected
     */
    protected _multipleMainDomain: Multiple;

    /**
     * multiple domains
     * @protected
     */
    protected _multipleDomains: Multiple;

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
     * switch update domains
     * @protected
     */
    protected _switchUpdateDomains: Switch;

    /**
     * select gateway identifier
     * @protected
     */
    protected _selectGatewayIdentifier: SelectBottemBorderOnly2;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'dyndnsclientmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupProvider = new FormGroup(bodyCard, 'Provider');
        this._selectProvider = new SelectBottemBorderOnly2(groupProvider);

        this._selectProvider.addValue({
            key: 'none',
            value: 'Please select your provider'
        });

        this._selectProvider.setSelectedValue('none');

        const groupUsername = new FormGroup(bodyCard, 'Username');
        this._inputUsername = new InputBottemBorderOnly2(groupUsername);

        const groupPassword = new FormGroup(bodyCard, 'Password');
        this._inputPassword = new InputBottemBorderOnly2(groupPassword, undefined, InputType.password);

        const groupMainDomain = new FormGroup(bodyCard, 'Main Domain');
        this._multipleMainDomain = new Multiple(groupMainDomain);
        this._multipleMainDomain.setLimit(1);

        const groupGatewayIdentifier = new FormGroup(bodyCard, 'Gateway network assignment');

        // eslint-disable-next-line no-new
        new TooltipInfo(groupGatewayIdentifier.getLabelElement(), Lang.i().l('dyndns_client_edit_gateway'));

        this._selectGatewayIdentifier = new SelectBottemBorderOnly2(groupGatewayIdentifier);

        const rowOptions = new FormRow(bodyCard);

        const groupUpdateDomains = new FormGroup(rowOptions.createCol(6), 'Enable update Domains');

        // eslint-disable-next-line no-new
        new TooltipInfo(groupUpdateDomains.getLabelElement(), Lang.i().l('dyndns_client_edit_updatedomains'));

        this._switchUpdateDomains = new Switch(groupUpdateDomains, 'updateDomains');

        const groupDomains = new FormGroup(bodyCard, 'Update Domains');
        this._multipleDomains = new Multiple(groupDomains);
        groupDomains.hide();

        this._switchUpdateDomains.setChangeFn((value: boolean) => {
            if (value) {
                groupDomains.show();
            } else {
                groupDomains.hide();
            }
        });

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);

        // init tooltips
        Tooltip.init();
    }

    /**
     * setProviders
     * @param {ProviderEntry[]} providers
     */
    public setProviders(providers: ProviderEntry[]): void {
        this._selectProvider.clearValues();

        this._selectProvider.addValue({
            key: 'none',
            value: 'without'
        });

        for (const provider of providers) {
            this._selectProvider.addValue({
                key: provider.name,
                value: provider.title
            });
        }

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
        this._multipleDomains.clearValues();

        for (const domain of domains) {
            this._multipleDomains.addValue({
                key: `${domain.id}`,
                value: domain.name
            });
        }
    }

    /**
     * Set main domains for select
     * @param {DomainData[]} domains
     */
    public setMainDomains(domains: DomainData[]): void {
        this._multipleMainDomain.clearValues();

        for (const domain of domains) {
            this._multipleMainDomain.addValue({
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

        this._multipleDomains.setValue(list);
    }

    /**
     * Get domains selected
     * @returns {DynDnsClientDomain[]}
     */
    public getDomainsSelected(): DynDnsClientDomain[] {
        const list: DynDnsClientDomain[] = [];

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
     * setUpdateDomains
     * @param update
     */
    public setUpdateDomains(update: boolean): void {
        this._switchUpdateDomains.setEnable(update);
    }

    /**
     * getUpdateDomains
     */
    public getUpdateDomains(): boolean {
        return this._switchUpdateDomains.isEnable();
    }

    /**
     * Set the main domain selected
     * @param {number} domainId
     */
    public setMainDomainSelected(domainId: number): void {
        this._multipleMainDomain.setValue([`${domainId}`]);
    }

    /**
     * Return the main domain selected
     * @returns {number}
     */
    public getMainDomainSelected(): number {
        const values = this._multipleMainDomain.getValue();

        if (values.length > 0) {
            return parseInt(values[0], 10);
        }

        return 0;
    }

    /**
     * setGatewayIdentifiers
     * @param list
     */
    public setGatewayIdentifiers(list: GatewayIdentifierEntry[]): void {
        this._selectGatewayIdentifier.clearValues();
        this._selectGatewayIdentifier.addValue({
            key: '0',
            value: 'Please select your Listen'
        });

        for (const aGatewayIdentiefer of list) {
            this._selectGatewayIdentifier.addValue({
                key: `${aGatewayIdentiefer.id}`,
                value: aGatewayIdentiefer.networkname
            });
        }
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
    public override resetValues(): void {
        this.setProvider('none');
        this._id = null;
        this.setGatewayIdentifier(0);
        this._multipleMainDomain.setValue([]);
        this._multipleDomains.setValue([]);
        this._inputUsername.setValue('');
        this._inputPassword.setValue('');
    }

}