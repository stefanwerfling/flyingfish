import {Form} from '../../Bambooo/Content/Form/Form';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {InputBottemBorderOnly2, InputType} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {Element} from '../../Bambooo/Element';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * IpAccessBlacklistOwnModal
 */
export class IpAccessBlacklistOwnModal extends ModalDialog {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input ip
     * @protected
     */
    protected _inputIp: InputBottemBorderOnly2;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'ipaccessblacklistowndialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"></div>').appendTo(this._body);
        const form = new Form(bodyCard);

        const groupIp = new FormGroup(form, 'Ip');
        this._inputIp = new InputBottemBorderOnly2(groupIp, 'ip', InputType.text);
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

}