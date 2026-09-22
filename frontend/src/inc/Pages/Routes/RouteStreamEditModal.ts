import {ListenData, SshPortEntry, UpStream} from 'flyingfish_schemas';
import {ButtonClass, ButtonDefault, ButtonDefaultType, Card, CardBodyType} from 'bambooo';
import {ListenTypes} from '../../Api/Listen.js';
import {NginxStreamDestinationType, NginxStreamSshR} from '../../Api/Route.js';
import {FfrField, FfrInput, FfrModal, FfrSection, FfrSegmented, FfrSelect, FfrSwitch} from '../../Components/FfrModal.js';
import {Lang} from '../../Lang.js';
import {UpstreamCard} from './UpstreamCard.js';

/**
 * RouteStreamEditModal — add/edit a stream route. Rendered in the FlyingFish `.ffr` design
 * language (see {@link FfrModal}): the former NavTab tabs (Details, Upstream, SSH, Listen,
 * Advanced) are flattened into {@link FfrSection}s whose visibility follows the selected
 * destination type. The upstream editor keeps the bambooo {@link Card}/{@link UpstreamCard}
 * widgets (out of scope). The public API (get/set per field + resetValues) is unchanged so
 * the page is agnostic to the widget set.
 */
export class RouteStreamEditModal {

    /**
     * the ffr modal
     * @protected
     */
    protected readonly _modal: FfrModal;

    /**
     * id of stream
     * @protected
     */
    protected _id: number|null = 0;

    /**
     * type-only stream
     * @protected
     */
    protected _type: number = 0;

    /**
     * Domainname or IP
     * @protected
     */
    protected readonly _inputDomainName: FfrInput;

    /**
     * domain id
     * @protected
     */
    protected _domainId: number|null = null;

    /**
     * Listen
     * @protected
     */
    protected readonly _selectListen: FfrSelect;

    /**
     * Listens data
     * @protected
     */
    protected _listens: ListenData[] = [];

    /**
     * Index
     * @protected
     */
    protected readonly _inputIndex: FfrInput;

    /**
     * Alias name
     * @protected
     */
    protected readonly _inputAliasName: FfrInput;

    /**
     * Destination type
     * @protected
     */
    protected readonly _selectDestinationType: FfrSelect;

    /**
     * upstream section element
     * @protected
     */
    protected readonly _secUpstream: JQuery;

    /**
     * upstream card
     * @protected
     */
    protected readonly _upstreamCard: Card;

    /**
     * upstream cards
     * @protected
     */
    protected _upstreamCards: UpstreamCard[] = [];

    /**
     * ssh section element
     * @protected
     */
    protected readonly _secSsh: JQuery;

    /**
     * ssh r type
     * @protected
     */
    protected readonly _selectSshRType: FfrSelect;

    /**
     * ssh type field element
     * @protected
     */
    protected readonly _fieldSshType: JQuery;

    /**
     * ssh port id
     * @protected
     */
    protected _sshport_id = 0;

    /**
     * ssh port field element
     * @protected
     */
    protected readonly _fieldSshPort: JQuery;

    /**
     * input ssh port
     * @protected
     */
    protected readonly _inputSshPort: FfrInput;

    /**
     * ssh user id
     * @protected
     */
    protected _sshuser_id: number = 0;

    /**
     * ssh username field element
     * @protected
     */
    protected readonly _fieldSshUsername: JQuery;

    /**
     * ssh username
     * @protected
     */
    protected readonly _inputSshUsername: FfrInput;

    /**
     * ssh password field element
     * @protected
     */
    protected readonly _fieldSshPassword: JQuery;

    /**
     * ssh password
     * @protected
     */
    protected readonly _inputSshPassword: FfrInput;

    /**
     * ssh destination address field element
     * @protected
     */
    protected readonly _fieldSshDesAddress: JQuery;

    /**
     * input ssh destination address
     * @protected
     */
    protected readonly _inputSshDesAddress: FfrInput;

    /**
     * ssh listen field element
     * @protected
     */
    protected readonly _fieldSshListen: JQuery;

    /**
     * ssh listen
     * @protected
     */
    protected readonly _selectSshListen: FfrSelect;

    /**
     * listen section element
     * @protected
     */
    protected readonly _secListen: JQuery;

    /**
     * destination listen
     * @protected
     */
    protected readonly _selectDestinationListen: FfrSelect;

    /**
     * use the stream as default
     * @protected
     */
    protected readonly _switchUseAsDefault: FfrSwitch;

    /**
     * load balancing algorithm
     * @protected
     */
    protected readonly _selectLoadBalanceAlg: FfrSegmented;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('Stream Route', 'Save changes');
        const body = this._modal.getBody();

        // details -----------------------------------------------------------------------------------------------------

        const secDetails = new FfrSection(body, 'Details');

        this._inputDomainName = new FfrInput(false);
        this._inputDomainName.element.attr('readonly', 'readonly');
        new FfrField(secDetails.element, 'Domain Name/IP').mount(this._inputDomainName.element);

        this._selectListen = new FfrSelect();
        new FfrField(secDetails.element, 'Listen').mount(this._selectListen.element);

        this._inputIndex = new FfrInput(true, 'auto sorting');
        new FfrField(secDetails.element, 'Index').mount(this._inputIndex.element);

        this._inputAliasName = new FfrInput(false, 'auto name');
        new FfrField(secDetails.element, 'Alias-Name (Intern)').mount(this._inputAliasName.element);

        this._selectDestinationType = new FfrSelect();
        this._selectDestinationType.setValues([
            {key: '-1', value: 'Please select a destination type'},
            {key: `${NginxStreamDestinationType.upstream}`, value: 'IP/Host direct (Stream)'},
            {key: `${NginxStreamDestinationType.ssh_r}`, value: 'Intern ssh server (Stream)'},
            {key: `${NginxStreamDestinationType.ssh_l}`, value: 'Extern ssh server (Stream)'},
            {key: `${NginxStreamDestinationType.listen}`, value: 'Intern Listen (Http/Https)'}
        ]);
        new FfrField(secDetails.element, 'Destination-Type').mount(this._selectDestinationType.element);

        // upstream ----------------------------------------------------------------------------------------------------

        const secUpstream = new FfrSection(body, 'Upstream');
        this._secUpstream = secUpstream.element;

        this._upstreamCard = new Card(secUpstream.element, CardBodyType.none);
        this._upstreamCard.setTitle('Upstream list');

        const addUpstreamBtn = new ButtonDefault(
            this._upstreamCard.getToolsElement(),
            '',
            'fa-plus',
            ButtonClass.tool,
            ButtonDefaultType.none
        );

        addUpstreamBtn.setOnClickFn(() => {
            this._upstreamCards.push(new UpstreamCard(this._upstreamCard, {
                port: 80,
                address: '192.168.178.1',
                proxy_protocol_out: false,
                id: 0
            }));
        });

        // ssh ---------------------------------------------------------------------------------------------------------

        const secSsh = new FfrSection(body, 'SSH');
        this._secSsh = secSsh.element;

        this._selectSshRType = new FfrSelect();
        this._selectSshRType.setValues([
            {key: `${NginxStreamSshR.none}`, value: 'Please select your SSH Type'},
            {key: `${NginxStreamSshR.in}`, value: 'SSH Server'},
            {key: `${NginxStreamSshR.out}`, value: 'SSH Port Listen'}
        ]);
        this._fieldSshType = new FfrField(secSsh.element, 'SSH Type').mount(this._selectSshRType.element).element;

        this._inputSshPort = new FfrInput(true, 'Empty for random port');
        this._fieldSshPort = new FfrField(secSsh.element, 'Listen Port').mount(this._inputSshPort.element).element;
        this._fieldSshPort.hide();

        this._inputSshUsername = new FfrInput(false);
        this._fieldSshUsername = new FfrField(secSsh.element, 'Username').mount(this._inputSshUsername.element).element;
        this._fieldSshUsername.hide();

        this._inputSshPassword = new FfrInput(false, 'leave blank if you do not want to change it');
        this._inputSshPassword.element.attr('type', 'password');
        this._fieldSshPassword = new FfrField(secSsh.element, 'Password').mount(this._inputSshPassword.element).element;
        this._fieldSshPassword.hide();

        this._inputSshDesAddress = new FfrInput(true);
        this._fieldSshDesAddress = new FfrField(secSsh.element, 'Destination IP Address').mount(this._inputSshDesAddress.element).element;

        this._selectSshListen = new FfrSelect();
        this._fieldSshListen = new FfrField(secSsh.element, 'Listen').mount(this._selectSshListen.element).element;
        this._fieldSshListen.hide();

        this._selectSshRType.onChange((value) => {
            if (this._selectDestinationType.getSelectedValue() === `${NginxStreamDestinationType.ssh_r}`) {
                this._fieldSshPort.hide();
                this._fieldSshUsername.hide();
                this._fieldSshPassword.hide();
                this._fieldSshListen.hide();

                switch (value) {
                    case `${NginxStreamSshR.in}`:
                        this._fieldSshPort.show();
                        this._fieldSshUsername.show();
                        this._fieldSshPassword.show();
                        break;

                    case `${NginxStreamSshR.out}`:
                        this._fieldSshListen.show();
                        break;
                }
            }
        });

        // intern listen -----------------------------------------------------------------------------------------------

        const secListen = new FfrSection(body, 'Listen');
        this._secListen = secListen.element;

        this._selectDestinationListen = new FfrSelect();
        new FfrField(secListen.element, 'Listen (Intern)').mount(this._selectDestinationListen.element);

        // advanced ----------------------------------------------------------------------------------------------------

        const secAdvanced = new FfrSection(body, 'Advanced');

        this._switchUseAsDefault = new FfrSwitch('Use as default stream', false);
        secAdvanced.element.append(this._switchUseAsDefault.element);

        this._selectLoadBalanceAlg = new FfrSegmented([
            {key: 'none', label: 'None'},
            {key: 'least_conn', label: 'Least conn'},
            {key: 'ip_hash', label: 'IP Hash'}
        ], 'none');
        new FfrField(
            secAdvanced.element,
            'Load balancing algorithm',
            Lang.i().l('route_stream_loadbalancealg')
        ).mount(this._selectLoadBalanceAlg.element);

        // select destination type -------------------------------------------------------------------------------------

        this._selectDestinationType.onChange((value) => {
            this._secUpstream.hide();
            this._secSsh.hide();
            this._secListen.hide();

            switch (parseInt(value, 10)) {
                case NginxStreamDestinationType.upstream:
                    this._secUpstream.show();
                    this._secSsh.hide();
                    this._secListen.hide();
                    break;

                case NginxStreamDestinationType.ssh_l:
                    this._fieldSshPort.show();
                    this._fieldSshUsername.show();
                    this._fieldSshPassword.show();
                    this._fieldSshDesAddress.show();

                    this._fieldSshType.hide();
                    this._secUpstream.hide();
                    this._secSsh.show();
                    this._secListen.hide();
                    break;

                case NginxStreamDestinationType.ssh_r:
                    this._fieldSshDesAddress.hide();
                    this.setSshRType(NginxStreamSshR.none);
                    this._fieldSshType.show();
                    this._secUpstream.hide();
                    this._secSsh.show();
                    this._secListen.hide();
                    break;

                case NginxStreamDestinationType.listen:
                    this._secUpstream.hide();
                    this._secSsh.hide();
                    this._secListen.show();
                    break;
            }
        });

        // initial section visibility ----------------------------------------------------------------------------------

        this._secUpstream.show();
        this._secSsh.hide();
        this._secListen.hide();
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
     * setId
     * @param id
     */
    public setId(id: number|null): void {
        this._id = id;
    }

    /**
     * getId
     */
    public getId(): number|null {
        return this._id;
    }

    /**
     * setDomainName
     * @param name
     */
    public setDomainName(name: string): void {
        this._inputDomainName.setValue(name);
    }

    /**
     * setDomainId
     * @param id
     */
    public setDomainId(id: number): void {
        this._domainId = id;
    }

    /**
     * getDomainId
     */
    public getDomainId(): number {
        if (this._domainId === null) {
            return 0;
        }

        return this._domainId;
    }

    /**
     * setListens
     * @param listens
     */
    public setListens(listens: ListenData[]): void {
        this._listens = listens;

        const listenOptions: {key: string; value: string;}[] = [{
            key: '0',
            value: 'Please select your Listen'
        }];

        const destListenOptions: {key: string; value: string;}[] = [{
            key: '0',
            value: 'Please select your Intern Listen'
        }];

        for (const alisten of this._listens) {
            if (alisten.routeless) {
                // eslint-disable-next-line no-continue
                continue;
            }

            const type = alisten.type === ListenTypes.stream ? 'Stream' : 'HTTP';

            const option = {
                key: `${alisten.id}`,
                value: `${alisten.name} - ${alisten.port} (${type})`
            };

            if (alisten.type === this._type) {
                listenOptions.push(option);
            } else {
                destListenOptions.push(option);
            }
        }

        this._selectListen.setValues(listenOptions);
        this._selectDestinationListen.setValues(destListenOptions);
    }

    /**
     * setListen
     * @param listen
     */
    public setListen(listen: string): void {
        this._selectListen.setSelectedValue(listen);
    }

    /**
     * getListen
     */
    public getListen(): number {
        return parseInt(this._selectListen.getSelectedValue(), 10) || 0;
    }

    /**
     * setDestinationType
     * @param type
     */
    public setDestinationType(type: NginxStreamDestinationType): void {
        this._selectDestinationType.setSelectedValue(`${type}`);
        this._selectDestinationType.element.trigger('change');
    }

    /**
     * getDestinatonType
     */
    public getDestinatonType(): number {
        return parseInt(this._selectDestinationType.getSelectedValue(), 10);
    }

    /**
     * setUpstreamList
     * @param upstreams
     */
    public setUpstreamList(upstreams: UpStream[]): void {
        for (const aupstream of upstreams) {
            this._upstreamCards.push(new UpstreamCard(this._upstreamCard, aupstream));
        }
    }

    /**
     * getUpstreamList
     */
    public getUpstreamList(): UpStream[] {
        const upstreams: UpStream[] = [];

        for (const upstreamcard of this._upstreamCards) {
            if (upstreamcard) {
                upstreams.push(upstreamcard.getUpstream());
            }
        }

        return upstreams;
    }

    /**
     * setAliasName
     * @param name
     */
    public setAliasName(name: string): void {
        this._inputAliasName.setValue(name);
    }

    /**
     * getAliasName
     */
    public getAliasName(): string {
        return this._inputAliasName.getValue();
    }

    /**
     * setIndex
     * @param index
     */
    public setIndex(index: number): void {
        this._inputIndex.setValue(`${index}`);
    }

    /**
     * getIndex
     */
    public getIndex(): number {
        return parseInt(this._inputIndex.getValue(), 10) || 0;
    }

    /**
     * setDestinationListen
     * @param listenid
     */
    public setDestinationListen(listenid: number): void {
        this._selectDestinationListen.setSelectedValue(`${listenid}`);
    }

    /**
     * getDestinationListen
     */
    public getDestinationListen(): number {
        return parseInt(this._selectDestinationListen.getSelectedValue(), 10) || 0;
    }

    /**
     * setSshRType
     * @param type
     */
    public setSshRType(type: NginxStreamSshR): void {
        this._selectSshRType.setSelectedValue(`${type}`);
        this._selectSshRType.element.trigger('change');
    }

    /**
     * getSshType
     */
    public getSshRType(): number {
        return parseInt(this._selectSshRType.getSelectedValue(), 10);
    }

    /**
     * setSshPortId
     * @param id
     */
    public setSshPortId(id: number): void {
        this._sshport_id = id;
    }

    /**
     * getSshPortId
     */
    public getSshPortId(): number {
        return this._sshport_id;
    }

    /**
     * setSshPort
     * @param port
     */
    public setSshPort(port: number): void {
        this._inputSshPort.setValue(`${port}`);
    }

    /**
     * getSshPort
     */
    public getSshPort(): number {
        return parseInt(this._inputSshPort.getValue(), 10) || 0;
    }

    /**
     * setSshUserId
     * @param id
     */
    public setSshUserId(id: number): void {
        if (id > 0) {
            this._inputSshPassword.element.attr('placeholder', 'Leave password blank if you don\'t want to change the password.');
        } else {
            this._inputSshPassword.element.attr('placeholder', '');
        }

        this._sshuser_id = id;
    }

    /**
     * getSshUserId
     */
    public getSshUserId(): number {
        return this._sshuser_id;
    }

    /**
     * setSshUsername
     * @param username
     */
    public setSshUsername(username: string): void {
        this._inputSshUsername.setValue(username);
    }

    /**
     * getSshUsername
     */
    public getSshUsername(): string {
        return this._inputSshUsername.getValue();
    }

    /**
     * setSshPassword
     * @param password
     */
    public setSshPassword(password: string): void {
        this._inputSshPassword.setValue(password);
    }

    /**
     * getSshPassword
     */
    public getSshPassword(): string {
        return this._inputSshPassword.getValue();
    }

    /**
     * setSshListens
     * @param listens
     */
    public setSshListens(listens: SshPortEntry[]): void {
        this._selectSshListen.setValues(listens.map((entry) => ({
            key: `${entry.id}`,
            value: `SSH INTERNT OUT (<-- ${entry.port})`
        })));
    }

    /**
     * setSshListen
     * @param listenid
     */
    public setSshListen(listenid: number): void {
        this._selectSshListen.setSelectedValue(`${listenid}`);
    }

    /**
     * getSshListen
     */
    public getSshListen(): string {
        return this._selectSshListen.getSelectedValue();
    }

    /**
     * setSshDestinationAddress
     * @param address
     */
    public setSshDestinationAddress(address: string): void {
        this._inputSshDesAddress.setValue(address);
    }

    /**
     * getSshDestinationAddress
     */
    public getSshDestinationAddress(): string {
        return this._inputSshDesAddress.getValue();
    }

    /**
     * setUseAsDefault
     * @param asdefault
     */
    public setUseAsDefault(asdefault: boolean): void {
        this._switchUseAsDefault.setOn(asdefault);
    }

    /**
     * getUseAsDefault
     */
    public getUseAsDefault(): boolean {
        return this._switchUseAsDefault.isOn();
    }

    /**
     * setLoadBalancingAlgorithm
     * @param alg
     */
    public setLoadBalancingAlgorithm(alg: string): void {
        this._selectLoadBalanceAlg.setValue(alg);
    }

    /**
     * getLoadBalancingAlgorithm
     */
    public getLoadBalancingAlgorithm(): string {
        return this._selectLoadBalanceAlg.getValue();
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setDomainName('');
        this._inputIndex.setValue('');
        this.setAliasName('');
        this.setListen('0');
        this.setDestinationType(NginxStreamDestinationType.listen);
        this.setSshRType(NginxStreamSshR.none);
        this.setUseAsDefault(false);
        this._inputSshPort.setValue('');
        this._inputSshPassword.element.attr('placeholder', '');
        this._selectSshListen.setValues([]);
        this._inputSshDesAddress.setValue('');

        this._upstreamCards.forEach((element, index) => {
            element.remove();
            delete this._upstreamCards[index];
        });
    }

}
