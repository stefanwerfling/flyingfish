import {FfrModal, FfrSection, FfrField, FfrInput, FfrSelect, FfrSwitch} from '../../Components/FfrModal.js';

/**
 * DomainRecordEditModal — add/edit a DNS record for a domain (type, class, TTL, value and the
 * DynDns-client update flag). Rendered in the FlyingFish `.ffr` design language (see
 * {@link FfrModal}): sectioned form, a select for the many record types, mono inputs for the
 * numeric/address fields and a switch. Public API (get/set per field + resetValues) is
 * unchanged so the page is agnostic to the widget set.
 */
export class DomainRecordEditModal {

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
     * domain id
     * @protected
     */
    protected _domainId: number|null = null;

    /**
     * input name
     * @protected
     */
    protected readonly _inputName: FfrInput;

    /**
     * select type
     * @protected
     */
    protected readonly _selectType: FfrSelect;

    /**
     * select class
     * @protected
     */
    protected readonly _selectClass: FfrSelect;

    /**
     * input ttl
     * @protected
     */
    protected readonly _inputTTL: FfrInput;

    /**
     * input value
     * @protected
     */
    protected readonly _inputValue: FfrInput;

    /**
     * switch update by dyn dns client
     * @protected
     */
    protected readonly _switchUByDynDnsClient: FfrSwitch;

    /**
     * switch: follow this node's resolved target IP (Attach/Router epic). For A/AAAA records
     * the answer follows the node target IP instead of the stored value.
     * @protected
     */
    protected readonly _switchFollowNode: FfrSwitch;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('Domain record', 'Save changes');
        const body = this._modal.getBody();

        const secDetails = new FfrSection(body, 'Details');

        this._inputName = new FfrInput(false, '');
        this._inputName.element.attr('readonly', 'readonly');
        new FfrField(secDetails.element, 'Domainname').mount(this._inputName.element);

        const rowTC = FfrField.row(secDetails.element);

        this._selectType = new FfrSelect();
        this._selectType.setValues([
            {key: '1', value: 'A'},
            {key: '2', value: 'NS'},
            {key: '5', value: 'CNAME'},
            {key: '15', value: 'MX'},
            {key: '16', value: 'TXT'},
            {key: '17', value: 'AAAA'}
        ]);
        new FfrField(rowTC, 'Type').mount(this._selectType.element);

        this._selectClass = new FfrSelect();
        this._selectClass.setValues([
            {key: '1', value: 'IN'}
        ]);
        new FfrField(rowTC, 'Class').mount(this._selectClass.element);

        this._inputTTL = new FfrInput(true, '300');
        this._inputTTL.setValue('300');
        new FfrField(secDetails.element, 'Time to Live').mount(this._inputTTL.element);

        this._inputValue = new FfrInput(true, '');
        new FfrField(secDetails.element, 'Value').mount(this._inputValue.element);

        // options ----------------------------------------------------------------------------------------------------
        const secOptions = new FfrSection(body, 'Options');
        this._switchUByDynDnsClient = new FfrSwitch('Update by DynDns Client', false);
        secOptions.element.append(this._switchUByDynDnsClient.element);

        this._switchFollowNode = new FfrSwitch('Follow node target IP (A/AAAA)', false);
        secOptions.element.append(this._switchFollowNode.element);
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
     * getDomainId
     */
    public getDomainId(): number|null {
        return this._domainId;
    }

    /**
     * setDomainId
     * @param id
     */
    public setDomainId(id: number|null): void {
        this._domainId = id;
    }

    /**
     * setDomainName
     * @param name
     */
    public setDomainName(name: string): void {
        this._inputName.setValue(name);
    }

    /**
     * setType
     * @param type
     */
    public setType(type: string): void {
        this._selectType.setSelectedValue(type);
    }

    /**
     * getType
     */
    public getType(): string {
        return this._selectType.getSelectedValue();
    }

    /**
     * setClass
     * @param aclass
     */
    public setClass(aclass: string): void {
        this._selectClass.setSelectedValue(aclass);
    }

    /**
     * getClass
     */
    public getClass(): string {
        return this._selectClass.getSelectedValue();
    }

    /**
     * setTTL
     * @param ttl
     */
    public setTTL(ttl: string): void {
        this._inputTTL.setValue(ttl);
    }

    /**
     * getTTL
     */
    public getTTL(): string {
        return this._inputTTL.getValue();
    }

    /**
     * setValue
     * @param value
     */
    public setValue(value: string): void {
        this._inputValue.setValue(value);
    }

    /**
     * getValue
     */
    public getValue(): string {
        return this._inputValue.getValue();
    }

    /**
     * setUpdateByDynDnsClient
     * @param update
     */
    public setUpdateByDynDnsClient(update: boolean): void {
        this._switchUByDynDnsClient.setOn(update);
    }

    /**
     * getUpdateByDynDnsClient
     */
    public getUpdateByDynDnsClient(): boolean {
        return this._switchUByDynDnsClient.isOn();
    }

    /**
     * setFollowNode
     * @param follow
     */
    public setFollowNode(follow: boolean): void {
        this._switchFollowNode.setOn(follow);
    }

    /**
     * getFollowNode
     */
    public getFollowNode(): boolean {
        return this._switchFollowNode.isOn();
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setDomainId(null);
        this.setDomainName('');
        this.setType('1');
        this.setClass('1');
        this.setTTL('300');
        this.setValue('');
        this.setUpdateByDynDnsClient(false);
        this.setFollowNode(false);
    }

}
