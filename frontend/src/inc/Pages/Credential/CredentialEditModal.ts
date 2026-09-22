import {CredentialSchemaTypes, ProviderEntry} from 'flyingfish_schemas';
import {FfrField, FfrInput, FfrModal, FfrSection, FfrSegmented, FfrSelect} from '../../Components/FfrModal.js';

/**
 * CredentialEditModal — add/edit a credential (name + auth schema + provider). Rendered in the
 * FlyingFish `.ffr` design language (see {@link FfrModal}): sectioned form, a segmented auth-schema
 * control and a provider dropdown. Public API (get/set per field + resetValues) is unchanged so the
 * page is agnostic to the widget set.
 */
export class CredentialEditModal {

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
     * input name
     * @protected
     */
    protected readonly _inputName: FfrInput;

    /**
     * segmented schema auth
     * @protected
     */
    protected readonly _segSchemaAuth: FfrSegmented;

    /**
     * select provider
     * @protected
     */
    protected readonly _selectProvider: FfrSelect;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('Credential', 'Save changes');
        const body = this._modal.getBody();

        const secDetails = new FfrSection(body, 'Details');

        this._inputName = new FfrInput(false, 'Name');
        new FfrField(secDetails.element, 'Name').mount(this._inputName.element);

        this._segSchemaAuth = new FfrSegmented([
            {key: `${CredentialSchemaTypes.Basic}`, label: 'Basic'},
            {key: `${CredentialSchemaTypes.Digest}`, label: 'Digest'}
        ], `${CredentialSchemaTypes.Basic}`);
        new FfrField(secDetails.element, 'Schema Auth').mount(this._segSchemaAuth.element);

        this._selectProvider = new FfrSelect();
        new FfrField(secDetails.element, 'Provider').mount(this._selectProvider.element);
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
    public setId(id: number): void {
        this._id = id;
    }

    /**
     * Return the credential name
     * @returns {string}
     */
    public getName(): string {
        return this._inputName.getValue();
    }

    /**
     * Set the name of credential
     * @param {string} name
     */
    public setName(name: string): void {
        this._inputName.setValue(name);
    }

    /**
     * Return the selected auth schema type
     * @returns {CredentialSchemaTypes}
     */
    public getAuthSchemaType(): CredentialSchemaTypes {
        switch (this._segSchemaAuth.getValue()) {
            case `${CredentialSchemaTypes.Basic}`:
                return CredentialSchemaTypes.Basic;

            case `${CredentialSchemaTypes.Digest}`:
                return CredentialSchemaTypes.Digest;
        }

        return CredentialSchemaTypes.Basic;
    }

    /**
     * Set the selected auth schema type
     * @param {string} type
     */
    public setAuthSchemaType(type: string): void {
        this._segSchemaAuth.setValue(type);
    }

    /**
     * setProviders
     * @param {ProviderEntry[]} providers
     */
    public setProviders(providers: ProviderEntry[]): void {
        const options: {key: string; value: string;}[] = [];

        options.push({
            key: 'none',
            value: 'Please select your provider'
        });

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
     * Set the selected provider
     * @param {string} providerName
     */
    public setProvider(providerName: string): void {
        this._selectProvider.setSelectedValue(providerName);
    }

    /**
     * Return the selected provider
     * @returns {string}
     */
    public getProvider(): string {
        return this._selectProvider.getSelectedValue();
    }

    /**
     * Reset all input fields
     */
    public resetValues(): void {
        this._id = null;
        this.setName('');
        this.setAuthSchemaType(`${CredentialSchemaTypes.Basic}`);
    }

}
