import {DomainData, DynDnsClientDomain, DynDnsClientProvider} from 'flyingfish_schemas';
import {FormGroup, FormRow, InputBottemBorderOnly2, InputType, Multiple, SelectBottemBorderOnly2, Switch, Element,
    ModalDialog, ModalDialogType} from 'bambooo';

/**
 * DynDnsClientEditModalButtonClickFn
 */
export type DynDnsClientEditModalButtonClickFn = () => Promise<void>;

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
     * click save fn
     * @protected
     */
    protected _onSaveClick: DynDnsClientEditModalButtonClickFn|null = null;

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

        const rowOptions = new FormRow(bodyCard);

        const groupUpdateDomains = new FormGroup(rowOptions.createCol(6), 'Update Domains');
        this._switchUpdateDomains = new Switch(groupUpdateDomains, 'updateDomains');

        const groupDomains = new FormGroup(bodyCard, 'Domains');
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

        jQuery('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>').appendTo(this._footer);
        const btnSave = jQuery('<button type="button" class="btn btn-primary">Save changes</button>').appendTo(this._footer);

        btnSave.on('click', async(): Promise<void> => {
            if (this._onSaveClick !== null) {
                this.showLoading();
                await this._onSaveClick();
                this.hideLoading();
            }
        });
    }

    /**
     * setProviders
     * @param providers
     */
    public setProviders(providers: DynDnsClientProvider[]): void {
        this._selectProvider.clearValues();

        this._selectProvider.addValue({
            key: 'none',
            value: 'Please select your provider'
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
     * setDomains
     * @param domains
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
    public setDomainSelected(domains: DynDnsClientDomain[]): void {
        const list: string[] = [];

        for (const domain of domains) {
            list.push(`${domain.id}`);
        }

        this._multipleDomains.setValue(list);
    }

    /**
     * getDomainSelected
     */
    public getDomainSelected(): DynDnsClientDomain[] {
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
     * resetValues
     */
    public override resetValues(): void {
        this.setProvider('none');
        this._multipleDomains.setValue([]);
        this._inputUsername.setValue('');
        this._inputPassword.setValue('');
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: DynDnsClientEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}