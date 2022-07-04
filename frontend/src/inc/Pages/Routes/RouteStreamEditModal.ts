import {ListenData} from '../../Api/Listen';
import {UpStream} from '../../Api/Route';
import {InfoBox} from '../../Bambooo/Content/Box/InfoBox';
import {ButtonClass, ButtonDefault, ButtonDefaultType} from '../../Bambooo/Content/Button/ButtonDefault';
import {Card, CardBodyType} from '../../Bambooo/Content/Card/Card';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {FormRow} from '../../Bambooo/Content/Form/FormRow';
import {InputBottemBorderOnly2, InputType} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {SelectBottemBorderOnly2} from '../../Bambooo/Content/Form/SelectBottemBorderOnly2';
import {NavTab} from '../../Bambooo/Content/Tab/NavTab';
import {Element} from '../../Bambooo/Element';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * RouteStreamEditModalDesType
 */
export enum RouteStreamEditModalDesType {
    upstream = '1',
    ssh = '2',
    listen = '3'
}

/**
 * UpstreamCard
 */
class UpstreamCard {

    /**
     * info box
     * @protected
     */
    protected _box: InfoBox;

    /**
     * upstream
     * @protected
     */
    protected _upstream: UpStream;

    /**
     * input address
     * @protected
     */
    protected _inputAddress: InputBottemBorderOnly2;

    /**
     * input port
     * @protected
     */
    protected _inputPort: InputBottemBorderOnly2;

    /**
     * constructor
     * @param card
     * @param upstream
     */
    public constructor(card: Card, upstream: UpStream) {
        this._upstream = upstream;

        this._box = new InfoBox(card.getElement());
        const rowDestination = new FormRow(this._box.getElement());

        const groupAddress = new FormGroup(rowDestination.createCol(6), 'Address');
        this._inputAddress = new InputBottemBorderOnly2(groupAddress.getElement());

        const groupPort = new FormGroup(rowDestination.createCol(6), 'Port');
        this._inputPort = new InputBottemBorderOnly2(groupPort.getElement(), undefined, InputType.number);

        const btnCol = rowDestination.createCol(1);

        const removeUpstreamBtn = new ButtonDefault(
            btnCol,
            '',
            'fa-trash',
            ButtonClass.tool,
            ButtonDefaultType.none
        );

        removeUpstreamBtn.setOnClickFn(() => {
            // todo mark as delete
            this.remove();
        });

        this.setAddress(upstream.address);
        this.setPort(`${upstream.port}`);
    }

    /**
     * setAddress
     * @param address
     */
    public setAddress(address: string): void {
        this._inputAddress.setValue(address);
    }

    /**
     * setPort
     * @param port
     */
    public setPort(port: string): void {
        this._inputPort.setValue(port);
    }

    /**
     * remove
     */
    public remove(): void {
        this._box.getElement().remove();
    }
}

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
     * ssh type
     * @protected
     */
    protected _selectSshType: SelectBottemBorderOnly2;

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

        this._navTab = new NavTab(this._body, 'domainnavtab');
        const tabDetails = this._navTab.addTab('Details', 'details');

        const tabUpstream = this._navTab.addTab('Upstream', 'upstream');
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

        const tabSsh = this._navTab.addTab('SSH', 'ssh');
        tabSsh.tab.hide();

        const tabListen = this._navTab.addTab('Listen', 'listen');
        tabListen.tab.hide();

        const tabAdvanced = this._navTab.addTab('Advanced', 'advanced');
        tabAdvanced.tab.show();

        // tab details -------------------------------------------------------------------------------------------------
        const bodyCard = jQuery('<div class="card-body"/>').appendTo(tabDetails.body);

        const groupDomainName = new FormGroup(bodyCard, 'Domain Name/IP');
        this._inputDomainName = new InputBottemBorderOnly2(groupDomainName.getElement());
        this._inputDomainName.setReadOnly(true);

        const groupListen = new FormGroup(bodyCard, 'Listen');
        this._selectListen = new SelectBottemBorderOnly2(groupListen.getElement());

        const groupIndex = new FormGroup(bodyCard, 'Index');
        this._inputIndex = new InputBottemBorderOnly2(groupIndex.getElement(), undefined, InputType.number);
        this._inputIndex.setPlaceholder('auto sorting');

        const groupAlias = new FormGroup(bodyCard, 'Alias-Name (Intern)');
        this._inputAliasName = new InputBottemBorderOnly2(groupAlias.getElement());
        this._inputAliasName.setPlaceholder('auto name');

        const groupDesType = new FormGroup(bodyCard, 'Destination-Type');
        this._selectDestinationType = new SelectBottemBorderOnly2(groupDesType.getElement());

        this._selectDestinationType.addValue({
            key: '0',
            value: 'Please select a destination type'
        });

        this._selectDestinationType.addValue({
            key: RouteStreamEditModalDesType.upstream,
            value: 'IP/Host direct (Stream)',
            style: 'background:#ffc107;'
        });

        this._selectDestinationType.addValue({
            key: RouteStreamEditModalDesType.ssh,
            value: 'Intern ssh server (Stream)',
            style: 'background:#007bff;'
        });

        this._selectDestinationType.addValue({
            key: RouteStreamEditModalDesType.listen,
            value: 'Intern Listen (Http/Https)',
            style: 'background:#28a745;'
        });

        this._selectDestinationType.setChangeFn((value) => {
            tabSsh.tab.hide();

            switch (value) {
                case RouteStreamEditModalDesType.upstream:
                    tabUpstream.tab.show();
                    tabSsh.tab.hide();
                    tabListen.tab.hide();
                    break;

                case RouteStreamEditModalDesType.ssh:
                    tabUpstream.tab.hide();
                    tabSsh.tab.show();
                    tabListen.tab.hide();
                    break;

                case RouteStreamEditModalDesType.listen:
                    tabUpstream.tab.hide();
                    tabSsh.tab.hide();
                    tabListen.tab.show();
                    break;
            }
        });

        // tab ssh -----------------------------------------------------------------------------------------------------

        const bodyCardSsh = jQuery('<div class="card-body"/>').appendTo(tabSsh.body);

        const groupSshType = new FormGroup(bodyCardSsh, 'SSH Type');
        this._selectSshType = new SelectBottemBorderOnly2(groupSshType.getElement());

        this._selectSshType.addValue({
            key: '0',
            value: 'Please select your SSH Type'
        });

        this._selectSshType.addValue({
            key: '1',
            value: 'SSH Server'
        });

        this._selectSshType.addValue({
            key: '2',
            value: 'SSH Port Listen'
        });

        this._groupSshUsername = new FormGroup(bodyCardSsh, 'Username');
        this._inputSshUsername = new InputBottemBorderOnly2(this._groupSshUsername.getElement());
        this._groupSshUsername.getElement().hide();

        this._groupSshPaasword = new FormGroup(bodyCardSsh, 'Password');
        this._inputSshPassword = new InputBottemBorderOnly2(this._groupSshPaasword.getElement(), undefined, InputType.password);
        this._groupSshPaasword.getElement().hide();

        this._groupSshListen = new FormGroup(bodyCardSsh, 'Listen');
        this._selectSshListen = new SelectBottemBorderOnly2(this._groupSshListen.getElement());
        this._groupSshListen.getElement().hide();

        this._selectSshType.setChangeFn(value => {
            this._groupSshUsername.getElement().hide();
            this._groupSshPaasword.getElement().hide();
            this._groupSshListen.getElement().hide();

            switch (value) {
                case '1':
                    this._groupSshUsername.getElement().show();
                    this._groupSshPaasword.getElement().show();
                    break;

                case '2':
                    this._groupSshListen.getElement().show();
                    break;
            }
        });

        // tab intern listen -------------------------------------------------------------------------------------------
        const bodyCardListen = jQuery('<div class="card-body"/>').appendTo(tabListen.body);

        const groupDListen = new FormGroup(bodyCardListen, 'Listen (Intern)');
        this._selectDestinationListen = new SelectBottemBorderOnly2(groupDListen.getElement());

        this._selectDestinationListen.addValue({
            key: '0',
            value: 'Please select your Intern Listen'
        });

        // buttons -----------------------------------------------------------------------------------------------------

        jQuery('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>').appendTo(this._footer);
        const btnSave = jQuery('<button type="button" class="btn btn-primary">Save changes</button>').appendTo(this._footer);

        btnSave.on('click', (): void => {
            if (this._onSaveClick !== null) {
                this._onSaveClick();
            }
        });
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
            const type = alisten.type === 0 ? 'Stream' : 'HTTP';

            const option = {
                key: `${alisten.id}`,
                value: `${alisten.name} - ${alisten.port} (${type})`,
                style: alisten.type === 0 ? 'background:#ffc107;' : 'background:#28a745;'
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
    public setDestinationType(type: RouteStreamEditModalDesType): void {
        this._selectDestinationType.setSelectedValue(`${type}`);
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
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setDomainName('');
        this._inputIndex.setValue('');
        this.setAliasName('');
        this.setListen('0');
        this.setDestinationType(RouteStreamEditModalDesType.listen);
        this._navTab.setTabSelect(0);

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