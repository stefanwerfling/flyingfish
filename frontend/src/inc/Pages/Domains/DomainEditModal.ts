import {InputBottemBorderOnly2} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {Element} from '../../Bambooo/Element';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * DomainEditModalButtonClickFn
 */
type DomainEditModalButtonClickFn = () => void;

/**
 * DomainEditModal
 */
export class DomainEditModal extends ModalDialog {

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
     * click save fn
     * @protected
     */
    protected _onSaveClick: DomainEditModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'domainmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupName = new FormGroup(bodyCard, 'Domainname');
        this._inputName = new InputBottemBorderOnly2(groupName.getElement());
        this._inputName.setPlaceholder('mydomain.com');

        jQuery('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>').appendTo(this._footer);
        const btnSave = jQuery('<button type="button" class="btn btn-primary">Save</button>').appendTo(this._footer);

        btnSave.on('click', (): void => {
            if (this._onSaveClick !== null) {
                this._onSaveClick();
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
    public setId(id: number|null): void {
        this._id = id;
    }

    /**
     * getName
     */
    public getName(): string {
        return this._inputName.getValue();
    }

    /**
     * setName
     * @param name
     */
    public setName(name: string): void {
        this._inputName.setValue(name);
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setName('');
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: DomainEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}