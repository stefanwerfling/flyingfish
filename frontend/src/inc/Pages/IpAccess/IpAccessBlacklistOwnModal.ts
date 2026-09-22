import {FfrField, FfrInput, FfrModal, FfrSection, FfrSwitch} from '../../Components/FfrModal.js';

/**
 * IpAccessBlacklistOwnModal — add/edit an own (manual) blacklist entry: an IP/CIDR, a disabled
 * flag and a description. Rendered in the FlyingFish `.ffr` design language (see {@link FfrModal}).
 * Public API (get/set per field + resetValues) is unchanged so the page is agnostic to the
 * widget set.
 */
export class IpAccessBlacklistOwnModal {

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
     * input ip
     * @protected
     */
    protected readonly _inputIp: FfrInput;

    /**
     * switch disabled
     * @protected
     */
    protected readonly _switchDisabled: FfrSwitch;

    /**
     * input description
     * @protected
     */
    protected readonly _inputDescription: FfrInput;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('Blacklist', 'Save changes');
        const body = this._modal.getBody();

        const secDetails = new FfrSection(body, 'Details');

        this._inputIp = new FfrInput(true, 'IP / CIDR');
        new FfrField(secDetails.element, 'IP').mount(this._inputIp.element);

        this._inputDescription = new FfrInput(false, 'A description ...');
        new FfrField(secDetails.element, 'Description').mount(this._inputDescription.element);

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
     * getIp
     */
    public getIp(): string {
        return this._inputIp.getValue();
    }

    /**
     * setIp
     * @param ip
     */
    public setIp(ip: string): void {
        this._inputIp.setValue(ip);
    }

    /**
     * setDisabled
     * @param disabled
     */
    public setDisabled(disabled: boolean): void {
        this._switchDisabled.setOn(disabled);
    }

    /**
     * getDisable
     */
    public getDisable(): boolean {
        return this._switchDisabled.isOn();
    }

    /**
     * setDescription
     * @param description
     */
    public setDescription(description: string): void {
        this._inputDescription.setValue(description);
    }

    /**
     * getDescription
     */
    public getDescription(): string {
        return this._inputDescription.getValue();
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setIp('');
        this.setDisabled(false);
        this.setDescription('');
    }

}
