import {ListenData, ListenTypes} from '../../Api/Listen';
import {NginxStreamDestinationType, NginxStreamSshR, UpStream} from '../../Api/Route';
import {SshPortEntry} from '../../Api/Ssh';
import {BadgeType} from '../../Bambooo/Content/Badge/Badge';
import {ButtonClass, ButtonDefault, ButtonDefaultType} from '../../Bambooo/Content/Button/ButtonDefault';
import {Card, CardBodyType} from '../../Bambooo/Content/Card/Card';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {InputBottemBorderOnly2, InputType} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {SelectBottemBorderOnly2} from '../../Bambooo/Content/Form/SelectBottemBorderOnly2';
import {Switch} from '../../Bambooo/Content/Form/Switch';
import {NavTab} from '../../Bambooo/Content/Tab/NavTab';
import {Tooltip} from '../../Bambooo/Content/Tooltip/Tooltip';
import {TooltipInfo} from '../../Bambooo/Content/Tooltip/TooltipInfo';
import {Element} from '../../Bambooo/Element';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';
import {Lang} from '../../Lang';
import {UpstreamCard} from './UpstreamCard';

/**
 * RouteStreamEditModalButtonClickFn
 */
type RouteStreamEditModalButtonClickFn = () => void;

/**
 * RouteStreamEditModal
 */
export class RouteStreamEditModal extends ModalDialog {

    /**
     * id of stream
     * @protected
     */
    protected _id: number|null = 0;

    /**
     * type only stream
     * @protected
     */
    protected _type: number = 0;

    /**
     * nav tab
     * @protected
     */
    protected _navTab: NavTab;

    /**
     * Domainname or IP
     * @protected
     */
    protected _inputDomainName: InputBottemBorderOnly2;

    /**
     * domain id
     * @protected
     */
    protected _domainId: number|null = null;

    /**
     * Listen
     * @protected
     */
    protected _selectListen: SelectBottemBorderOnly2;

    /**
     * Listens data
     * @protected
     */
    protected _listens: ListenData[] = [];

    /**
     * Index
     * @protected
     */
    protected _inputIndex: InputBottemBorderOnly2;

    /**
     * Alias name
     * @protected
     */
    protected _inputAliasName: InputBottemBorderOnly2;

    /**
     * Destination type
     * @protected
     */
    protected _selectDestinationType: SelectBottemBorderOnly2;

    /**
     * upstream card
     * @protected
     */
    protected _upstreamCard: Card;

    /**
     * upstream cards
     * @protected
     */
    protected _upstreamCards: UpstreamCard[] = [];

    /**
     * ssh r type
     * @protected
     */
    protected _selectSshRType: SelectBottemBorderOnly2;

    /**
     * ssh port id
     * @protected
     */
    protected _sshport_id = 0;

    /**
     * group ssh port
     * @protected
     */
    protected _groupSshPort: FormGroup;

    /**
     * input ssh port
     * @protected
     */
    protected _inputSshPort: InputBottemBorderOnly2;

    /**
     * ssh user id
     * @protected
     */
    protected _sshuser_id: number = 0;

    /**
     * group ssh username
     * @protected
     */
    protected _groupSshUsername: FormGroup;

    /**
     * ssh username
     * @protected
     */
    protected _inputSshUsername: InputBottemBorderOnly2;

    /**
     * group ssh password
     * @protected
     */
    protected _groupSshPaasword: FormGroup;

    /**
     * ssh password
     * @protected
     */
    protected _inputSshPassword: InputBottemBorderOnly2;

    /**
     * group ssh destination address
     * @protected
     */
    protected _groupSshDesAddress: FormGroup;

    /**
     * input ssh destination address
     * @protected
     */
    protected _inputSshDesAddress: InputBottemBorderOnly2;

    /**
     * group ssh listen
     * @protected
     */
    protected _groupSshListen: FormGroup;

    /**
     * ssh listen
     * @protected
     */
    protected _selectSshListen: SelectBottemBorderOnly2;

    /**
     * destination listen
     * @protected
     */
    protected _selectDestinationListen: SelectBottemBorderOnly2;

    /**
     * use the stream as default
     * @protected
     */
    protected _switchUseAsDefault: Switch;

    /**
     * load balancing algorithm
     * @protected
     */
    protected _selectLoadBalanceAlg: SelectBottemBorderOnly2;

    /**
     * click save fn
     * @protected
     */
    protected _onSaveClick: RouteStreamEditModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'routestreammodaldialog', ModalDialogType.large);

        this._navTab = new NavTab(this._body, 'routestreamnavtab');
        const tabDetails = this._navTab.addTab('Details', 'routestreamdetails');

        const tabUpstream = this._navTab.addTab('Upstream', 'routestreamupstream');
        tabUpstream.tab.show();

        this._upstreamCard = new Card(tabUpstream.body, CardBodyType.none);
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
                id: 0
            }))
        });

        const tabSsh = this._navTab.addTab('SSH', 'routestreamssh');
        tabSsh.tab.hide();

        const tabListen = this._navTab.addTab('Listen', 'routestreamlisten');
        tabListen.tab.hide();

        const tabAdvanced = this._navTab.addTab('Advanced', 'routestreamadvanced');
        tabAdvanced.tab.show();

        // tab details -------------------------------------------------------------------------------------------------
        const bodyCard = jQuery('<div class="card-body"/>').appendTo(tabDetails.body);

        const groupDomainName = new FormGroup(bodyCard, 'Domain Name/IP');
        this._inputDomainName = new InputBottemBorderOnly2(groupDomainName);
        this._inputDomainName.setReadOnly(true);

        const groupListen = new FormGroup(bodyCard, 'Listen');
        this._selectListen = new SelectBottemBorderOnly2(groupListen);

        const groupIndex = new FormGroup(bodyCard, 'Index');
        this._inputIndex = new InputBottemBorderOnly2(groupIndex, undefined, InputType.number);
        this._inputIndex.setPlaceholder('auto sorting');

        const groupAlias = new FormGroup(bodyCard, 'Alias-Name (Intern)');
        this._inputAliasName = new InputBottemBorderOnly2(groupAlias);
        this._inputAliasName.setPlaceholder('auto name');

        const groupDesType = new FormGroup(bodyCard, 'Destination-Type');
        this._selectDestinationType = new SelectBottemBorderOnly2(groupDesType);

        this._selectDestinationType.addValue({
            key: '-1',
            value: 'Please select a destination type'
        });

        this._selectDestinationType.addValue({
            key: `${NginxStreamDestinationType.upstream}`,
            value: 'IP/Host direct (Stream)',
            style: 'background:#ffc107;'
        });

        this._selectDestinationType.addValue({
            key: `${NginxStreamDestinationType.ssh_r}`,
            value: 'Intern ssh server (Stream)',
            style: 'background:#007bff;'
        });

        this._selectDestinationType.addValue({
            key: `${NginxStreamDestinationType.ssh_l}`,
            value: 'Extern ssh server (Stream)',
            style: `background:${BadgeType.color_cream_purpel};`
        });

        this._selectDestinationType.addValue({
            key: `${NginxStreamDestinationType.listen}`,
            value: 'Intern Listen (Http/Https)',
            style: 'background:#28a745;'
        });

        // tab ssh -----------------------------------------------------------------------------------------------------

        const bodyCardSsh = jQuery('<div class="card-body"/>').appendTo(tabSsh.body);

        const groupSshType = new FormGroup(bodyCardSsh, 'SSH Type');
        this._selectSshRType = new SelectBottemBorderOnly2(groupSshType);

        this._selectSshRType.addValue({
            key: `${NginxStreamSshR.none}`,
            value: 'Please select your SSH Type'
        });

        this._selectSshRType.addValue({
            key: `${NginxStreamSshR.in}`,
            value: 'SSH Server'
        });

        this._selectSshRType.addValue({
            key: `${NginxStreamSshR.out}`,
            value: 'SSH Port Listen'
        });

        this._groupSshPort = new FormGroup(bodyCardSsh, 'Listen Port');
        this._inputSshPort = new InputBottemBorderOnly2(this._groupSshPort, undefined, InputType.number);
        this._inputSshPort.setPlaceholder('Empty for random port');
        this._groupSshPort.getElement().hide();

        this._groupSshUsername = new FormGroup(bodyCardSsh, 'Username');
        this._inputSshUsername = new InputBottemBorderOnly2(this._groupSshUsername);
        this._groupSshUsername.getElement().hide();

        this._groupSshPaasword = new FormGroup(bodyCardSsh, 'Password');
        this._inputSshPassword = new InputBottemBorderOnly2(this._groupSshPaasword, undefined, InputType.password);
        this._inputSshPassword.setPlaceholder('leave blank if you do not want to change it');
        this._groupSshPaasword.getElement().hide();

        this._groupSshDesAddress = new FormGroup(bodyCardSsh, 'Destination IP Address');
        this._inputSshDesAddress = new InputBottemBorderOnly2(this._groupSshDesAddress);
        this._inputSshDesAddress.setPlaceholder('');

        this._groupSshListen = new FormGroup(bodyCardSsh, 'Listen');
        this._selectSshListen = new SelectBottemBorderOnly2(this._groupSshListen);
        this._groupSshListen.getElement().hide();

        this._selectSshRType.setChangeFn(value => {
            if (this._selectDestinationType.getSelectedValue() === `${NginxStreamDestinationType.ssh_r}`) {
                this._groupSshPort.getElement().hide();
                this._groupSshUsername.getElement().hide();
                this._groupSshPaasword.getElement().hide();
                this._groupSshListen.getElement().hide();

                switch (value) {
                    case `${NginxStreamSshR.in}`:
                        this._groupSshPort.getElement().show();
                        this._groupSshUsername.getElement().show();
                        this._groupSshPaasword.getElement().show();
                        break;

                    case `${NginxStreamSshR.out}`:
                        this._groupSshListen.getElement().show();
                        break;
                }
            }
        });

        // tab intern listen -------------------------------------------------------------------------------------------

        const bodyCardListen = jQuery('<div class="card-body"/>').appendTo(tabListen.body);

        const groupDListen = new FormGroup(bodyCardListen, 'Listen (Intern)');
        this._selectDestinationListen = new SelectBottemBorderOnly2(groupDListen);

        this._selectDestinationListen.addValue({
            key: '0',
            value: 'Please select your Intern Listen'
        });

        // tab advanced ------------------------------------------------------------------------------------------------

        const bodyCardAdvanced = jQuery('<div class="card-body"/>').appendTo(tabAdvanced.body);

        const groupUseAsDefault = new FormGroup(bodyCardAdvanced, 'Use as default stream');
        new TooltipInfo(groupUseAsDefault.getLabelElement(), Lang.i().l('route_stream_useasdefault'));
        this._switchUseAsDefault = new Switch(groupUseAsDefault, 'use_as_default');

        const groupLoadBalanceAlg = new FormGroup(bodyCardAdvanced, 'Load balancing algorithm');
        new TooltipInfo(groupLoadBalanceAlg.getLabelElement(), Lang.i().l('route_stream_loadbalancealg'));
        this._selectLoadBalanceAlg = new SelectBottemBorderOnly2(groupLoadBalanceAlg);

        this._selectLoadBalanceAlg.addValue({
            key: 'none',
            value: 'None'
        });

        this._selectLoadBalanceAlg.addValue({
            key: 'least_conn',
            value: 'Least conn'
        });

        this._selectLoadBalanceAlg.addValue({
            key: 'ip_hash',
            value: 'IP Hash'
        })

        // select destination type -------------------------------------------------------------------------------------

        this._selectDestinationType.setChangeFn((value) => {
            tabUpstream.tab.hide();
            tabSsh.tab.hide();
            tabListen.tab.hide();

            switch (parseInt(value, 10)) {
                case NginxStreamDestinationType.upstream:
                    tabUpstream.tab.show();
                    tabSsh.tab.hide();
                    tabListen.tab.hide();
                    break;

                case NginxStreamDestinationType.ssh_l:
                    this._groupSshPort.getElement().show();
                    this._groupSshUsername.getElement().show();
                    this._groupSshPaasword.getElement().show();
                    this._groupSshDesAddress.show();

                    groupSshType.hide();
                    tabUpstream.tab.hide();
                    tabSsh.tab.show();
                    tabListen.tab.hide();
                    break;

                case NginxStreamDestinationType.ssh_r:
                    this._groupSshDesAddress.hide();
                    this.setSshRType(NginxStreamSshR.none);
                    groupSshType.show();
                    tabUpstream.tab.hide();
                    tabSsh.tab.show();
                    tabListen.tab.hide();
                    break;

                case NginxStreamDestinationType.listen:
                    tabUpstream.tab.hide();
                    tabSsh.tab.hide();
                    tabListen.tab.show();
                    break;
            }
        });

        // buttons -----------------------------------------------------------------------------------------------------

        jQuery('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>').appendTo(this._footer);
        const btnSave = jQuery('<button type="button" class="btn btn-primary">Save changes</button>').appendTo(this._footer);

        btnSave.on('click', (): void => {
            if (this._onSaveClick !== null) {
                this._onSaveClick();
            }
        });

        // init tooltips
        Tooltip.init();
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
        this._selectListen.clearValues();

        this._selectListen.addValue({
            key: '0',
            value: 'Please select your Listen'
        });

        for (const alisten of this._listens) {
            if (alisten.routeless) {
                continue;
            }

            const type = alisten.type === ListenTypes.stream ? 'Stream' : 'HTTP';

            const option = {
                key: `${alisten.id}`,
                value: `${alisten.name} - ${alisten.port} (${type})`,
                style: alisten.type === ListenTypes.stream ? 'background:#ffc107;' : 'background:#28a745;'
            };

            if (alisten.type !== this._type) {
                this._selectDestinationListen.addValue(option);

            } else {
                this._selectListen.addValue(option);
            }
        }
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
            this._inputSshPassword.setPlaceholder('Leave password blank if you don\'t want to change the password.');
        } else {
            this._inputSshPassword.setPlaceholder('');
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
        for (const entry of listens) {
            this._selectSshListen.addValue({
                key: `${entry.id}`,
                value: `SSH INTERNT OUT (<-- ${entry.port})`
            })
        }
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
        this._switchUseAsDefault.setEnable(asdefault);
    }

    /**
     * getUseAsDefault
     */
    public getUseAsDefault(): boolean {
        return this._switchUseAsDefault.isEnable();
    }

    /**
     * setLoadBalancingAlgorithm
     * @param alg
     */
    public setLoadBalancingAlgorithm(alg: string): void {
        this._selectLoadBalanceAlg.setSelectedValue(alg);
    }

    /**
     * getLoadBalancingAlgorithm
     */
    public getLoadBalancingAlgorithm(): string {
        return this._selectLoadBalanceAlg.getSelectedValue();
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
        this._navTab.setTabSelect(0);
        this._inputSshPassword.setPlaceholder('');
        this._selectSshListen.clearValues();
        this._inputSshDesAddress.setValue('');

        this._upstreamCards.forEach((element, index) => {
            element.remove();
            delete this._upstreamCards[index];
        });
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: RouteStreamEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }
}