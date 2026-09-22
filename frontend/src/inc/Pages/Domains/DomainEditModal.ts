import {FfrModal, FfrSection, FfrField, FfrInput, FfrSwitch} from '../../Components/FfrModal.js';

/**
 * DomainEditModal — add/edit a domain (name + disabled state). Rendered in the FlyingFish
 * `.ffr` design language (see {@link FfrModal}): sectioned form with a text input and a
 * switch. Public API (get/set per field + resetValues) is unchanged so the page is agnostic
 * to the widget set.
 */
export class DomainEditModal {

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
     * input name
     * @protected
     */
    protected readonly _inputName: FfrInput;

    /**
     * switch disable
     * @protected
     */
    protected readonly _switchDisable: FfrSwitch;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('Domain', 'Save changes');
        const body = this._modal.getBody();

        const secDetails = new FfrSection(body, 'Details');

        this._inputName = new FfrInput(false, 'mydomain.com');
        new FfrField(secDetails.element, 'Domainname').mount(this._inputName.element);

        this._switchDisable = new FfrSwitch('Disable this Domain', false);
        secDetails.element.append(this._switchDisable.element);
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
     * setDisable
     * @param disable
     */
    public setDisable(disable: boolean): void {
        this._switchDisable.setOn(disable);
    }

    /**
     * getDisable
     */
    public getDisable(): boolean {
        return this._switchDisable.isOn();
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setName('');
        this.setDisable(false);
    }

}
