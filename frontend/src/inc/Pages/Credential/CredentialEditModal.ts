import {
    FormGroup,
    InputBottemBorderOnly2,
    ModalDialog,
    ModalDialogType,
    Element,
    SelectBottemBorderOnly2
} from 'bambooo';
import {CredentialSchemaTypes, ProviderEntry} from 'flyingfish_schemas';

/**
 * CredentialEditModalButtonClickFn
 */
export type CredentialEditModalButtonClickFn = () => Promise<void>;

/**
 * Credential edit modal
 */
export class CredentialEditModal extends ModalDialog {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input name
     * @protected
     */
    protected _inputName: InputBottemBorderOnly2;

    /**
     * select schema auth
     * @protected
     */
    protected _selectSchemaAuth: SelectBottemBorderOnly2;

    /**
     * select provider
     * @protected
     */
    protected _selectProvider: SelectBottemBorderOnly2;

    /**
     * click save fn
     * @protected
     */
    protected _onSaveClick: CredentialEditModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'credentialmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupName = new FormGroup(bodyCard, 'Name');
        this._inputName = new InputBottemBorderOnly2(groupName.getElement());

        const groupSchemaAuth = new FormGroup(bodyCard, 'Schema Auth');
        this._selectSchemaAuth = new SelectBottemBorderOnly2(groupSchemaAuth);

        this._selectSchemaAuth.addValue({
            key: `${CredentialSchemaTypes.Basic}`,
            value: 'Basic'
        });

        this._selectSchemaAuth.addValue({
            key: `${CredentialSchemaTypes.Digest}`,
            value: 'Digest'
        });

        const groupProvider = new FormGroup(bodyCard, 'Provider');
        this._selectProvider = new SelectBottemBorderOnly2(groupProvider);

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
        switch (this._selectSchemaAuth.getSelectedValue()) {
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
        this._selectSchemaAuth.setSelectedValue(type);
    }

    /**
     * setProviders
     * @param {ProviderEntry[]} providers
     */
    public setProviders(providers: ProviderEntry[]): void {
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
     * Set the on save event
     * @param {CredentialEditModalButtonClickFn} onSave
     */
    public setOnSave(onSave: CredentialEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}