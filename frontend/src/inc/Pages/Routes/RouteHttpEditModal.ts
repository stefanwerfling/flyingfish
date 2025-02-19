import {
    Badge,
    BadgeType,
    Card,
    CardBodyType,
    CardLine,
    CardType,
    Element,
    FormGroup,
    FormRow,
    Icon,
    IconFa,
    InputBottemBorderOnly2,
    InputType, LangText,
    ModalDialog,
    ModalDialogType,
    NavTab,
    PText,
    PTextType,
    SelectBottemBorderOnly2,
    StrongText,
    Switch,
    Table,
    Td,
    Tooltip,
    TooltipInfo,
    Tr
} from 'bambooo';
import {ListenData, Location, ProviderEntry, RouteVariable, SshPortEntry} from 'flyingfish_schemas';
import moment from 'moment';
import {ListenCategory, ListenTypes} from '../../Api/Listen.js';
import {NginxHTTPVariables} from '../../Api/Route.js';
import {Ssl as SslAPI} from '../../Api/Ssl.js';
import {Lang} from '../../Lang.js';
import {LocationListWidget} from './Location/LocationListWidget.js';

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
     * location badge info
     * @protected
     */
    protected _locationTabBadge: Badge;

    /**
     * location cards
     * @protected
     */
    protected _locationCollection: LocationListWidget;

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
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'routehttpmodaldialog', ModalDialogType.large);

        this._navTab = new NavTab(this._body, 'routehttpnavtab');

        const tabDetails = this._navTab.addTab('Details', 'routehttpdetails');
        const tabSsl = this._navTab.addTab('SSL', 'routehttpssl');
        const tabLocation = this._navTab.addTab('Location', 'routehttplocation');

        tabLocation.title.append('&nbsp;');

        this._locationTabBadge = new Badge(
            tabLocation.title,
            '0',
            BadgeType.success
        );

        this._locationTabBadge.hide();

        // tab location ------------------------------------------------------------------------------------------------

        this._locationCollection = new LocationListWidget(tabLocation.body, () => {
            this._updateLocationTabBadge();
        },true);

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
        this._inputVariableCmbs = new InputBottemBorderOnly2(groupVariableCmbs, undefined, InputType.number);
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
                        // Issuer --------------------------------------------------------------------------------------
                        const strongIssuer = new StrongText(this._sslCertDetails);
                        // eslint-disable-next-line no-new
                        new Icon(strongIssuer, IconFa.certificate);
                        strongIssuer.getElement().append('&nbsp;Issuer');

                        const tableIssuer = new Table(this._sslCertDetails);

                        for (const issuerData of certDetails.issuer) {
                            const tTrIssuer = new Tr(tableIssuer);

                            // eslint-disable-next-line no-new
                            new Td(tTrIssuer, `<b>${issuerData.key}</b>`);
                            // eslint-disable-next-line no-new
                            new Td(tTrIssuer, `${issuerData.value}`);
                        }

                        this._sslCertDetails.getElement().append('<hr>');

                        // subject -------------------------------------------------------------------------------------

                        const strongSubject = new StrongText(this._sslCertDetails);
                        // eslint-disable-next-line no-new
                        new Icon(strongSubject, IconFa.certificate);
                        strongSubject.getElement().append('&nbsp;Subject');

                        const tableSubject = new Table(this._sslCertDetails);

                        for (const subjectData of certDetails.subject) {
                            const tTrSubject = new Tr(tableSubject);

                            // eslint-disable-next-line no-new
                            new Td(tTrSubject, `<b>${subjectData.key}</b>`);
                            // eslint-disable-next-line no-new
                            new Td(tTrSubject, `${subjectData.value}`);
                        }

                        this._sslCertDetails.getElement().append('<hr>');

                        // serial number -------------------------------------------------------------------------------
                        const strongSerial = new StrongText(this._sslCertDetails);
                        // eslint-disable-next-line no-new
                        new Icon(strongSerial, IconFa.lock);
                        strongSerial.getElement().append('&nbsp;Serial');

                        const pSerial = new PText(this._sslCertDetails, PTextType.muted);
                        pSerial.getElement().append(certDetails.serialNumber);

                        this._sslCertDetails.getElement().append('<hr>');

                        // signatureAlgo -------------------------------------------------------------------------------

                        const strongSigAlgo = new StrongText(this._sslCertDetails);
                        // eslint-disable-next-line no-new
                        new Icon(strongSigAlgo, IconFa.lock);
                        strongSigAlgo.getElement().append('&nbsp;Signature Algorithm');

                        const pSigAlg = new PText(this._sslCertDetails, PTextType.muted);
                        pSigAlg.getElement().append(certDetails.signatureAlgorithm);

                        this._sslCertDetails.getElement().append('<hr>');

                        // valid from/to -------------------------------------------------------------------------------
                        const strongDate = new StrongText(this._sslCertDetails);
                        // eslint-disable-next-line no-new
                        new Icon(strongDate, IconFa.calendar);
                        strongDate.getElement().append('&nbsp;Validate');

                        const certFromDate = moment(certDetails.dateNotBefore);
                        const certToDate = moment(certDetails.dateNotAfter);

                        const tableValidate = new Table(this._sslCertDetails);
                        const trFrom = new Tr(tableValidate);
                        // eslint-disable-next-line no-new
                        new Td(trFrom, '<b>from</b>');
                        // eslint-disable-next-line no-new
                        new Td(trFrom, `${certFromDate.format('YYYY-MM-DD HH:mm:ss')}`);

                        const trTo = new Tr(tableValidate);
                        // eslint-disable-next-line no-new
                        new Td(trTo, '<b>to</b>');
                        // eslint-disable-next-line no-new
                        new Td(trTo, `${certToDate.format('YYYY-MM-DD HH:mm:ss')}`);

                        this._sslCertDetails.getElement().append('<hr>');
                    }
                }
            }
        });

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);

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
                style: style
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
        this._locationCollection.setLocationList(locations, (entry): void => {
            entry.setSshListens(this._sshListens);
        }).then();
    }

    /**
     * Update the location tab badge
     * @protected
     */
    protected _updateLocationTabBadge(): void {
        const count = this._locationCollection.getSize();

        if (count > 0) {
            this._locationTabBadge.show();

            this._locationTabBadge.getElement().empty().text(count);
        } else {
            this._locationTabBadge.hide();
        }
    }

    /**
     * getLocations
     */
    public getLocations(): Location[] {
        return this._locationCollection.getLocationList();
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
    public setSslProviders(providers: ProviderEntry[]): void {
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
    public override resetValues(): void {
        this.setId(null);
        this.setDomainName('');
        this._inputIndex.setValue('');
        this.setListen('0');
        this.setSslEnable(false);
        this._switchHttp2Enable.setInativ(true);
        this.setHttp2Enable(false);
        this.setXFrameOptions('');
        this._inputVariableCmbs.setValue('');
        this._locationCollection.removeAll();
    }

}