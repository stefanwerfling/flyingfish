import {DomainData} from '../../Api/Domain';
import {DynDnsProvider} from '../../Api/DynDnsClient';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {InputBottemBorderOnly2, InputType} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {Multiple} from '../../Bambooo/Content/Form/Multiple';
import {SelectBottemBorderOnly2} from '../../Bambooo/Content/Form/SelectBottemBorderOnly2';
import {Element} from '../../Bambooo/Element';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

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
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'dyndnsclientmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupProvider = new FormGroup(bodyCard, 'Provider');
        this._selectProvider = new SelectBottemBorderOnly2(groupProvider);

        const groupDomains = new FormGroup(bodyCard, 'Domains');
        this._multipleDomains = new Multiple(groupDomains);

        const groupUsername = new FormGroup(bodyCard, 'Username');
        this._inputUsername = new InputBottemBorderOnly2(groupUsername);

        const groupPassword = new FormGroup(bodyCard, 'Password');
        this._inputPassword = new InputBottemBorderOnly2(groupPassword, undefined, InputType.password);
    }

    /**
     * setProviders
     * @param providers
     */
    public setProviders(providers: DynDnsProvider[]): void {
        this._selectProvider.clearValues();

        for (const provider of providers) {
            this._selectProvider.addValue({
                key: provider.name,
                value: provider.title
            });
        }
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
     * resetValues
     */
    public resetValues(): void {

    }
}