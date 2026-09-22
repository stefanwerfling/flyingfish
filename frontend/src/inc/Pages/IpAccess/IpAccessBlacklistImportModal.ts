import {FfrModal, FfrSection, FfrSwitch} from '../../Components/FfrModal.js';

/**
 * IpAccessBlacklistImportModal — edit an imported blacklist entry (only the disabled flag is
 * editable, the entry itself is maintained by the import source). Rendered in the FlyingFish
 * `.ffr` design language (see {@link FfrModal}). Public API (get/set per field + resetValues)
 * is unchanged so the page is agnostic to the widget set.
 */
export class IpAccessBlacklistImportModal {

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
     * switch disabled
     * @protected
     */
    protected readonly _switchDisabled: FfrSwitch;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('Blacklist Import', 'Save changes');
        const body = this._modal.getBody();

        const secState = new FfrSection(body, 'State');
        this._switchDisabled = new FfrSwitch('Disabled this ip block', false);
        secState.element.append(this._switchDisabled.element);
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
    public setId(id: number|null): void {
        this._id = id;
    }

    /**
     * setDisabled
     * @param disabled
     */
    public setDisabled(disabled: boolean): void {
        this._switchDisabled.setOn(disabled);
    }

    /**
     * getDisabled
     */
    public getDisabled(): boolean {
        return this._switchDisabled.isOn();
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setDisabled(false);
    }

}
