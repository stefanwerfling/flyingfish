import {
    FormGroup,
    InputBottemBorderOnly2,
    ModalDialog,
    ModalDialogType,
    Element,
    SelectBottemBorderOnly2
} from 'bambooo';
import {CredentialSchemaTypes, ProviderEntry} from 'flyingfish_schemas/dist/src';

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
    }

    /**
     * getId
     */
    public getId(): number|null {
        return this._id;
    }

    /**
     * setProviders
     * @param providers
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

}