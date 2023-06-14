import {ListenData, Location, RouteVariable, SshPortEntry, SslProvider} from 'flyingfish_schemas';
import {ListenCategory, ListenTypes} from '../../Api/Listen';
import {
    NginxHTTPVariables,
    NginxLocationDestinationTypes
} from '../../Api/Route';
import {Ssl as SslAPI} from '../../Api/Ssl';
import {
    ButtonClass, ButtonDefault, ButtonDefaultType, Card, CardBodyType, CardLine, CardType, FormGroup,
    InputBottemBorderOnly2, InputType, SelectBottemBorderOnly2, Switch, Icon, IconFa, NavTab, PText, PTextType,
    StrongText, Tooltip, TooltipInfo, Element, ModalDialog, ModalDialogType, FormRow
} from 'bambooo';
import {Lang} from '../../Lang';
import {LocationCard} from './LocationCard';

/**
 * RouteHttpEditModalButtonClickFn
 */
export type RouteHttpEditModalButtonClickFn = () => void;

/**
 * RouteHttpEditModal
 */
export class RouteHttpEditModal extends ModalDialog {

    /**
     * type only http/s
     * @protected
     */
    protected _type: number = 1;

    /**
     * id of http
     * @protected
     */
    protected _id: number|null = 0;

    /**
     * nav tab
     * @protected
     */
    protected _navTab: NavTab;

    /**
     * location card
     * @protected
     */
    protected _locationCard: Card;

    /**
     * location cards
     * @protected
     */
    protected _locationCards: LocationCard[] = [];

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
     * ssh listens
     * @protected
     */
    protected _sshListens: SshPortEntry[] = [];

    /**
     * ssl enable
     * @protected
     */
    protected _switchSslEnable: Switch;

    /**
     * ssl provider
     * @protected
     */
    protected _selectSslProvider: SelectBottemBorderOnly2;

    /**
     * ssl cert details
     * @protected
     */
    protected _sslCertDetails: Card;

    /**
     * ssl email
     * @protected
     */
    protected _inputSslEmail: InputBottemBorderOnly2;

    /**
     * switch http2 enable
     * @protected
     */
    protected _switchHttp2Enable: Switch;

    /**
     * select X-Frame-Options
     * @protected
     */
    protected _selectXFrameOptions: SelectBottemBorderOnly2;

    /**
     * switch wellknown disabled
     * @protected
     */
    protected _switchWellknownDisabled: Switch;

    /**
     * input variable client_max_body_size
     * @protected
     */
    protected _inputVariableCmbs: InputBottemBorderOnly2;

    /**
     * click save fn
     * @protected
     */
    protected _onSaveClick: RouteHttpEditModalButtonClickFn|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'routehttpmodaldialog', ModalDialogType.large);

        this._navTab = new NavTab(this._body, 'routehttpnavtab');

        const tabDetails = this._navTab.addTab('Details', 'routehttpdetails');
        const tabSsl = this._navTab.addTab('SSL', 'routehttpssl');
        const tabLocation = this._navTab.addTab('Location', 'routehttplocation');

        // tab location ------------------------------------------------------------------------------------------------

        this._locationCard = new Card(tabLocation.body, CardBodyType.none);
        this._locationCard.setTitle('Location list');

        const addLocationBtn = new ButtonDefault(
            this._locationCard.getToolsElement(),
            '',
            'fa-plus',
            ButtonClass.tool,
            ButtonDefaultType.none
        );

        addLocationBtn.setOnClickFn(() => {
            const location = new LocationCard(this._locationCard, this._locationCards.length + 1);
            location.setSshListens(this._sshListens);
            location.setLocation({
                id: 0,
                destination_type: NginxLocationDestinationTypes.none,
                ssh: {},
                match: '',
                proxy_pass: '',
                auth_enable: false,
                websocket_enable: false,
                xrealip_enable: true,
                xforwarded_for_enable: true,
                xforwarded_proto_enable: true,
                xforwarded_scheme_enable: true,
                host_enable: true,
                host_name: '',
                host_name_port: 0,
                variables: []
            });

            this._locationCards.push(location);
        });

        // tab advanced ------------------------------------------------------------------------------------------------

        const tabAdvanced = this._navTab.addTab('Advanced', 'routehttpadvanced');
        tabAdvanced.tab.show();

        const bodyACard = jQuery('<div class="card-body"/>').appendTo(tabAdvanced.body);

        const rowHttp2WellKnown = new FormRow(bodyACard);

        const groupHttp2Enable = new FormGroup(rowHttp2WellKnown.createCol(6), 'HTTP2 Enable');
        // eslint-disable-next-line no-new
        new TooltipInfo(groupHttp2Enable.getLabelElement(), Lang.i().l('route_http_http2'));
        this._switchHttp2Enable = new Switch(groupHttp2Enable.getElement(), 'adv_http2_enable');
        this._switchHttp2Enable.setInativ(true);

        const groupWellknown = new FormGroup(rowHttp2WellKnown.createCol(6), 'well-known disabled');
        this._switchWellknownDisabled = new Switch(groupWellknown.getElement(), 'adv_wellknown_disabled');

        const groupXFrameOptions = new FormGroup(bodyACard, 'X-Frame-Options');
        this._selectXFrameOptions = new SelectBottemBorderOnly2(groupXFrameOptions);
        this._selectXFrameOptions.addValue({
            key: '',
            value: 'None'
        });

        this._selectXFrameOptions.addValue({
            key: 'SAMEORIGIN',
            value: 'SAMEORIGIN'
        });

        this._selectXFrameOptions.addValue({
            key: 'DENY',
            value: 'DENY'
        });

        const groupVariableCmbs = new FormGroup(bodyACard, 'Client max body size (MB)');
        this._inputVariableCmbs = new InputBottemBorderOnly2(groupVariableCmbs, InputType.number);
        this._inputVariableCmbs.setPlaceholder('1');

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

        // tab ssl -----------------------------------------------------------------------------------------------------

        const bodyCardSsl = jQuery('<div class="card-body"/>').appendTo(tabSsl.body);

        const groupSslEnable = new FormGroup(bodyCardSsl, 'SSL Enable');
        this._switchSslEnable = new Switch(groupSslEnable, 'ssl_enable');

        const groupSslProvider = new FormGroup(bodyCardSsl, 'SSL Provider');
        this._selectSslProvider = new SelectBottemBorderOnly2(groupSslProvider);
        groupSslProvider.hide();

        const groupSslEmail = new FormGroup(bodyCardSsl, 'SSL EMail');
        this._inputSslEmail = new InputBottemBorderOnly2(groupSslEmail);
        this._inputSslEmail.setPlaceholder('admin@flyingfish.org');
        groupSslEmail.hide();

        this._sslCertDetails = new Card(bodyCardSsl, CardBodyType.none, CardType.primary, CardLine.none);
        // eslint-disable-next-line no-new
        new Icon(this._sslCertDetails.getTitleElement(), IconFa.certificate);
        this._sslCertDetails.getTitleElement().append('&nbsp;Certificate Details');
        this._sslCertDetails.hide();

        this._switchSslEnable.setChangeFn(async(value) => {
            this._switchHttp2Enable.setInativ(true);
            groupSslProvider.hide();
            groupSslEmail.hide();
            this._sslCertDetails.hide();

            if (value) {
                this._switchHttp2Enable.setInativ(false);
                groupSslProvider.show();
                groupSslEmail.show();

                if (this._id) {
                    this._sslCertDetails.show();
                    this._sslCertDetails.emptyBody();

                    const certDetails = await SslAPI.getCertDetails(this._id);

                    if (certDetails) {
                        // serial number
                        const strongSerial = new StrongText(this._sslCertDetails);
                        // eslint-disable-next-line no-new
                        new Icon(strongSerial, IconFa.info);
                        strongSerial.getElement().append('&nbsp;Serial');

                        const pSerial = new PText(this._sslCertDetails, PTextType.muted);
                        pSerial.getElement().append(certDetails.serialNumber);

                        this._sslCertDetails.getElement().append('<hr>');

                        // issued to

                        // issued by

                        // valid from
                        const strongDate = new StrongText(this._sslCertDetails);
                        // eslint-disable-next-line no-new
                        new Icon(strongDate, IconFa.info);
                        strongDate.getElement().append('&nbsp;Validate');

                        const pvalidate = new PText(this._sslCertDetails, PTextType.muted);
                        pvalidate.getElement().append(`<b>from</b> ${certDetails.dateNotBefore} <b>to</b> ${certDetails.dateNotAfter}`);

                        this._sslCertDetails.getElement().append('<hr>');
                    }
                }
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
                // eslint-disable-next-line no-continue
                continue;
            }

            const type = alisten.type === 0 ? 'Stream' : 'HTTP';
            let style = alisten.type === ListenTypes.stream ? 'background:#ffc107;' : 'background:#28a745;';

            if (alisten.listen_category) {
                switch (alisten.listen_category) {
                    case ListenCategory.default_https:
                        style = 'background:#28a745;';
                        break;

                    case ListenCategory.default_http:
                        style = 'background:#CCCCFF';
                        break;
                }
            }

            const option = {
                key: `${alisten.id}`,
                value: `${alisten.name} - ${alisten.port} (${type})`,
                style
            };

            if (alisten.type === this._type) {
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
     * setLocations
     * @param locations
     */
    public setLocations(locations: Location[]): void {
        for (const tlocation of locations) {
            const location = new LocationCard(this._locationCard, this._locationCards.length + 1);
            location.setSshListens(this._sshListens);
            location.setLocation(tlocation);

            this._locationCards.push(location);
        }
    }

    /**
     * getLocations
     */
    public getLocations(): Location[] {
        const list: Location[] = [];

        for (const tlocation of this._locationCards) {
            if (tlocation) {
                list.push(tlocation.getLocation());
            }
        }

        return list;
    }

    /**
     * setVariables
     * @param variables
     */
    public setVariables(variables: RouteVariable[]): void {
        for (const aVariable of variables) {
            switch (aVariable.name) {
                case NginxHTTPVariables.client_max_body_size:
                    this._inputVariableCmbs.setValue(aVariable.value);
                    break;
            }
        }
    }

    /**
     * getVariables
     */
    public getVariables(): RouteVariable[] {
        const variables: RouteVariable[] = [];

        variables.push({
            name: NginxHTTPVariables.client_max_body_size,
            value: this._inputVariableCmbs.getValue()
        });

        return variables;
    }

    /**
     * setSshListens
     * @param listens
     */
    public setSshListens(listens: SshPortEntry[]): void {
        this._sshListens = listens;
    }

    /**
     * setSslEnable
     * @param enable
     */
    public setSslEnable(enable: boolean): void {
        this._switchSslEnable.setEnable(enable);
        this._switchHttp2Enable.setInativ(false);
    }

    /**
     * getSslEnable
     */
    public getSslEnable(): boolean {
        return this._switchSslEnable.isEnable();
    }

    /**
     * setSslProviders
     * @param providers
     */
    public setSslProviders(providers: SslProvider[]): void {
        this._selectSslProvider.clearValues();

        this._selectSslProvider.addValue({
            key: '',
            value: 'Please select your Provider'
        });

        for (const provider of providers) {
            this._selectSslProvider.addValue({
                key: provider.name,
                value: provider.title
            });
        }
    }

    /**
     * setSslProvider
     * @param provider
     */
    public setSslProvider(provider: string): void {
        this._selectSslProvider.setSelectedValue(provider);
    }

    /**
     * getSslProvider
     */
    public getSslProvider(): string {
        return this._selectSslProvider.getSelectedValue();
    }

    /**
     * setSslEmail
     * @param email
     */
    public setSslEmail(email: string): void {
        this._inputSslEmail.setValue(email);
    }

    /**
     * getSslEmail
     */
    public getSslEmail(): string {
        return this._inputSslEmail.getValue();
    }

    /**
     * setHttp2Enable
     * @param enable
     */
    public setHttp2Enable(enable: boolean): void {
        this._switchHttp2Enable.setEnable(enable);
    }

    /**
     * getHttp2Enable
     */
    public getHttp2Enable(): boolean {
        return this._switchHttp2Enable.isEnable();
    }

    /**
     * setXFrameOptions
     * @param option
     */
    public setXFrameOptions(option: string): void {
        this._selectXFrameOptions.setSelectedValue(option);
    }

    /**
     * getXFrameOptions
     */
    public getXFrameOptions(): string {
        return this._selectXFrameOptions.getSelectedValue();
    }

    /**
     * setWellKnownDisabled
     * @param disabled
     */
    public setWellKnownDisabled(disabled: boolean): void {
        this._switchWellknownDisabled.setEnable(disabled);
    }

    /**
     * getWellKnwonDisabled
     */
    public getWellKnwonDisabled(): boolean {
        return this._switchWellknownDisabled.isEnable();
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setDomainName('');
        this._inputIndex.setValue('');
        this.setListen('0');
        this.setSslEnable(false);
        this._switchHttp2Enable.setInativ(true);
        this.setHttp2Enable(false);
        this.setXFrameOptions('');
        this._inputVariableCmbs.setValue('');

        this._locationCards.forEach((element, index) => {
            element.remove();
            delete this._locationCards[index];
        });
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: RouteHttpEditModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}