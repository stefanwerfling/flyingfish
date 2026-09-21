import {ListenVariable} from 'flyingfish_schemas';
import {ListenAddressCheckType, ListenTypes, NginxListenStreamServerVariables} from '../../Api/Listen.js';
import {FfrField, FfrInput, FfrModal, FfrSection, FfrSegmented, FfrSwitch} from '../../Components/FfrModal.js';

/**
 * ListensEditModal — add/edit a listener (port + type + options). Rendered in the FlyingFish
 * `.ffr` design language (see {@link FfrModal}): sectioned form, segmented type/protocol
 * controls, switches. The stream-only advanced section (proxy timeouts) shows only when the
 * type is Stream. Public API (get/set per field + resetValues) is unchanged so the page is
 * agnostic to the widget set.
 */
export class ListensEditModal {

    protected readonly _modal: FfrModal;

    protected _id: number|null = null;

    protected readonly _inputName: FfrInput;

    protected readonly _segType: FfrSegmented;

    protected readonly _segProtocol: FfrSegmented;

    protected readonly _inputPort: FfrInput;

    protected readonly _inputDescription: FfrInput;

    protected readonly _switchIp6: FfrSwitch;

    protected readonly _switchAddressCheck: FfrSwitch;

    protected readonly _segAddressCheckType: FfrSegmented;

    protected readonly _switchProxyProtocol: FfrSwitch;

    protected readonly _switchProxyProtocolIn: FfrSwitch;

    protected readonly _switchDisable: FfrSwitch;

    protected readonly _inputStreamProxyTimeout: FfrInput;

    protected readonly _inputStreamProxyConnectTimeout: FfrInput;

    protected readonly _secAdvanced: FfrSection;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('Listen', 'Save changes');
        const body = this._modal.getBody();

        // details ----------------------------------------------------------------------------------------------------
        const secDetails = new FfrSection(body, 'Details');

        this._inputName = new FfrInput(false, 'Listenname');
        new FfrField(secDetails.element, 'Name').mount(this._inputName.element);

        const rowTP = FfrField.row(secDetails.element);

        this._segType = new FfrSegmented([
            {key: `${ListenTypes.stream}`, label: 'Stream'},
            {key: `${ListenTypes.http}`, label: 'Http/Https'}
        ], `${ListenTypes.stream}`);
        this._segType.onChange((value) => this._applyTypeVisibility(value));
        new FfrField(rowTP, 'Type').mount(this._segType.element);

        this._inputPort = new FfrInput(true, '80');
        new FfrField(rowTP, 'Port').mount(this._inputPort.element);

        this._segProtocol = new FfrSegmented([
            {key: '0', label: 'TCP'},
            {key: '1', label: 'UDP'},
            {key: '2', label: 'TCP & UDP'}
        ], '0');
        new FfrField(secDetails.element, 'Protocol').mount(this._segProtocol.element);

        this._inputDescription = new FfrInput(false, 'A description ...');
        new FfrField(secDetails.element, 'Description').mount(this._inputDescription.element);

        this._switchIp6 = new FfrSwitch('IPv6 enable', false);
        secDetails.element.append(this._switchIp6.element);

        // access -----------------------------------------------------------------------------------------------------
        const secAccess = new FfrSection(body, 'IP access');

        this._switchAddressCheck = new FfrSwitch('Enable IP access check', false);
        secAccess.element.append(this._switchAddressCheck.element);

        this._segAddressCheckType = new FfrSegmented([
            {key: `${ListenAddressCheckType.black}`, label: 'Blacklist'},
            {key: `${ListenAddressCheckType.white}`, label: 'Whitelist'}
        ], `${ListenAddressCheckType.black}`);
        new FfrField(secAccess.element, 'Access type').mount(this._segAddressCheckType.element);

        // proxy protocol ---------------------------------------------------------------------------------------------
        const secProxy = new FfrSection(body, 'Proxy protocol');
        this._switchProxyProtocol = new FfrSwitch('Proxy protocol enable', false);
        secProxy.element.append(this._switchProxyProtocol.element);
        this._switchProxyProtocolIn = new FfrSwitch('Proxy protocol incoming enable', false);
        secProxy.element.append(this._switchProxyProtocolIn.element);

        // advanced (stream only) -------------------------------------------------------------------------------------
        this._secAdvanced = new FfrSection(body, 'Advanced (stream)');

        this._inputStreamProxyTimeout = new FfrInput(true, '10');
        new FfrField(this._secAdvanced.element, 'Proxy timeout (minutes)', 'Stream proxy timeout, in minutes.').mount(this._inputStreamProxyTimeout.element);

        this._inputStreamProxyConnectTimeout = new FfrInput(true, '60');
        new FfrField(this._secAdvanced.element, 'Proxy connect timeout (seconds)', 'Stream proxy connect timeout, in seconds.').mount(this._inputStreamProxyConnectTimeout.element);

        // disable ----------------------------------------------------------------------------------------------------
        const secState = new FfrSection(body, 'State');
        this._switchDisable = new FfrSwitch('Disable this listen', false);
        secState.element.append(this._switchDisable.element);

        this._applyTypeVisibility(`${ListenTypes.stream}`);
    }

    /**
     * Show/hide the stream-only advanced section for the selected type.
     * @param type - the selected listen type key
     * @protected
     */
    protected _applyTypeVisibility(type: string): void {
        this._secAdvanced.element.toggle(type === `${ListenTypes.stream}`);
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
     * getType
     */
    public getType(): string {
        return this._segType.getValue();
    }

    /**
     * setType
     * @param type
     */
    public setType(type: string): void {
        this._segType.setValue(type);
        this._applyTypeVisibility(type);
    }

    /**
     * getPort
     */
    public getPort(): string {
        return this._inputPort.getValue();
    }

    /**
     * setPort
     * @param port
     */
    public setPort(port: string): void {
        this._inputPort.setValue(port);
    }

    /**
     * getProtocol
     */
    public getProtocol(): string {
        return this._segProtocol.getValue();
    }

    /**
     * setProtocol
     * @param protocol
     */
    public setProtocol(protocol: string): void {
        this._segProtocol.setValue(protocol);
    }

    /**
     * getDescription
     */
    public getDescription(): string {
        return this._inputDescription.getValue();
    }

    /**
     * setDescription
     * @param description
     */
    public setDescription(description: string): void {
        this._inputDescription.setValue(description);
    }

    /**
     * getIp6
     */
    public getIp6(): boolean {
        return this._switchIp6.isOn();
    }

    /**
     * setIp6
     * @param enable
     */
    public setIp6(enable: boolean): void {
        this._switchIp6.setOn(enable);
    }

    /**
     * getAddressCheck
     */
    public getAddressCheck(): boolean {
        return this._switchAddressCheck.isOn();
    }

    /**
     * setAddressCheck
     * @param enable
     */
    public setAddressCheck(enable: boolean): void {
        this._switchAddressCheck.setOn(enable);
    }

    /**
     * getAddressCheckType
     */
    public getAddressCheckType(): number {
        return parseInt(this._segAddressCheckType.getValue(), 10) || ListenAddressCheckType.black;
    }

    /**
     * setAddressCheckType
     * @param actype
     */
    public setAddressCheckType(actype: number): void {
        this._segAddressCheckType.setValue(`${actype}`);
    }

    /**
     * setProxyProtocol
     * @param enable
     */
    public setProxyProtocol(enable: boolean): void {
        this._switchProxyProtocol.setOn(enable);
    }

    /**
     * getProxyProtocol
     */
    public getProxyProtocol(): boolean {
        return this._switchProxyProtocol.isOn();
    }

    /**
     * setProxyProtocolIn
     * @param enable
     */
    public setProxyProtocolIn(enable: boolean): void {
        this._switchProxyProtocolIn.setOn(enable);
    }

    /**
     * getProxyProtocolIn
     */
    public getProxyProtocolIn(): boolean {
        return this._switchProxyProtocolIn.isOn();
    }

    /**
     * getDisable
     */
    public getDisable(): boolean {
        return this._switchDisable.isOn();
    }

    /**
     * setDisable
     * @param disable
     */
    public setDisable(disable: boolean): void {
        this._switchDisable.setOn(disable);
    }

    /**
     * Return the stream proxy timeout
     * @returns {string}
     */
    public getStreamProxyTimeout(): string {
        return this._inputStreamProxyTimeout.getValue();
    }

    /**
     * Set the stream proxy timeout
     * @param {string} value
     */
    public setStreamProxyTimeout(value: string): void {
        this._inputStreamProxyTimeout.setValue(value);
    }

    /**
     * Return the stream proxy connect timeout
     * @returns {string}
     */
    public getStreamProxyConnectTimeout(): string {
        return this._inputStreamProxyConnectTimeout.getValue();
    }

    /**
     * Set stream proxy connect timeout
     * @param {string} value
     */
    public setStreamProxyConnectTimeout(value: string): void {
        this._inputStreamProxyConnectTimeout.setValue(value);
    }

    /**
     * Set stream server variables
     * @param variables
     */
    public setStreamServerVariables(variables: ListenVariable[]): void {
        for (const aVariable of variables) {
            switch (aVariable.name) {
                case NginxListenStreamServerVariables.proxy_timeout:
                    this.setStreamProxyTimeout(aVariable.value);
                    break;

                case NginxListenStreamServerVariables.proxy_connect_timeout:
                    this.setStreamProxyConnectTimeout(aVariable.value);
                    break;
            }
        }
    }

    /**
     * Return the stream server variables
     * @returns {ListenVariable[]}
     */
    public getStreamServerVariables(): ListenVariable[] {
        const variables: ListenVariable[] = [];

        variables.push({
            name: NginxListenStreamServerVariables.proxy_timeout,
            value: this.getStreamProxyTimeout()
        });

        variables.push({
            name: NginxListenStreamServerVariables.proxy_connect_timeout,
            value: this.getStreamProxyConnectTimeout()
        });

        return variables;
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setName('');
        this.setType(`${ListenTypes.stream}`);
        this.setPort('');
        this.setProtocol('0');
        this.setDescription('');
        this.setIp6(false);
        this.setAddressCheck(false);
        this.setAddressCheckType(ListenAddressCheckType.black);
        this.setDisable(false);
        this.setProxyProtocol(false);
        this.setProxyProtocolIn(false);
        this.setStreamProxyTimeout('');
        this.setStreamProxyConnectTimeout('');
    }

}
