import {Form} from '../../Bambooo/Content/Form/Form';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {Switch} from '../../Bambooo/Content/Form/Switch';
import {Element} from '../../Bambooo/Element';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * IpAccessBlacklistImportModalButtonClickFn
 */
type IpAccessBlacklistImportModalButtonClickFn = () => void;

/**
 * IpAccessBlacklistImportModal
 */
export class IpAccessBlacklistImportModal extends ModalDialog {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * switch disable
     * @protected
     */
    protected _switchDisable: Switch;

    /**
     * click save fn
     * @protected
     */
    protected _onSaveClick: IpAccessBlacklistImportModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'ipaccessblacklistimportdialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"></div>').appendTo(this._body);
        const form = new Form(bodyCard);

        const groupDisable = new FormGroup(form, 'Disable this ip block');
        this._switchDisable = new Switch(groupDisable, 'ipimportblockdisable');

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
     * setDisable
     * @param disable
     */
    public setDisable(disable: boolean): void {
        this._switchDisable.setEnable(disable);
    }

    /**
     * getDisable
     */
    public getDisable(): boolean {
        return this._switchDisable.isEnable();
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setDisable(false);
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: IpAccessBlacklistImportModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}