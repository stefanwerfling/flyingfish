import {
    Card,
    CardBodyType,
    CardLine,
    CardType,
    Icon,
    IconFa,
    PText,
    PTextType,
    StrongText,
    Table,
    Td,
    Tr
} from 'bambooo';
import {
    ListenData,
    Location,
    ProviderSslEntry,
    RouteVariable,
    SshPortEntry,
    SslListWildcardEntry
} from 'flyingfish_schemas';
import moment from 'moment';
import {ListenTypes} from '../../Api/Listen.js';
import {NginxHTTPVariables} from '../../Api/Route.js';
import {Ssl as SslAPI} from '../../Api/Ssl.js';
import {FfrField, FfrInput, FfrModal, FfrSection, FfrSegmented, FfrSelect, FfrSwitch} from '../../Components/FfrModal.js';
import {LocationListWidget} from './Location/LocationListWidget.js';

/**
 * RouteHttpEditModal — add/edit an http/https route. Rendered in the FlyingFish `.ffr` design
 * language (see {@link FfrModal}): the former NavTab tabs (Details, SSL, Location, Advanced)
 * and the nested SSL NavTab (Provider, Certificates, Cert-Details) are flattened into
 * {@link FfrSection}s whose visibility follows the SSL enable switch and the provider/wildcard
 * selection. The location editor keeps the bambooo {@link LocationListWidget}, and the SSL
 * certificate details keep the bambooo {@link Card} display (both out of scope). The public
 * API (get/set per field + resetValues) is unchanged so the page is agnostic to the widget set.
 */
export class RouteHttpEditModal {

    /**
     * the ffr modal
     * @protected
     */
    protected readonly _modal: FfrModal;

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
     * SSL badge info (in the SSL section legend)
     * @protected
     */
    protected readonly _sslTabBadge: JQuery;

    /**
     * location badge info (in the Location section legend)
     * @protected
     */
    protected readonly _locationTabBadge: JQuery;

    /**
     * location cards
     * @protected
     */
    protected readonly _locationCollection: LocationListWidget;

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
     * ssh listens
     * @protected
     */
    protected _sshListens: SshPortEntry[] = [];

    /**
     * ssl enable
     * @protected
     */
    protected readonly _switchSslEnable: FfrSwitch;

    /**
     * SSL configuration area (shown when SSL is enabled)
     * @protected
     */
    protected readonly _sslArea: JQuery;

    /**
     * Ssl Provider list
     * @protected
     */
    protected _sslProviderList: ProviderSslEntry[] = [];

    /**
     * ssl provider section element
     * @protected
     */
    protected readonly _secSslProvider: JQuery;

    /**
     * ssl provider
     * @protected
     */
    protected readonly _selectSslProvider: FfrSelect;

    /**
     * ssl certificate section element
     * @protected
     */
    protected readonly _secSslCert: JQuery;

    /**
     * ssl cert details
     * @protected
     */
    protected readonly _sslCertDetails: Card;

    /**
     * ssl email
     * @protected
     */
    protected readonly _inputSslEmail: FfrInput;

    /**
     * ssl wildcard
     * @protected
     */
    protected readonly _switchSslWildcard: FfrSwitch;

    /**
     * switch http2 enable
     * @protected
     */
    protected readonly _switchHttp2Enable: FfrSwitch;

    /**
     * select X-Frame-Options
     * @protected
     */
    protected readonly _selectXFrameOptions: FfrSegmented;

    /**
     * switch wellknown disabled
     * @protected
     */
    protected readonly _switchWellknownDisabled: FfrSwitch;

    /**
     * input variable client_max_body_size
     * @protected
     */
    protected readonly _inputVariableCmbs: FfrInput;

    /**
     * select ssl wildcard cert
     * @protected
     */
    protected readonly _selectSslWildcardCert: FfrSelect;

    /**
     * constructor
     */
    public constructor() {
        this._modal = new FfrModal('Http/Https Route', 'Save changes');
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

        // ssl ---------------------------------------------------------------------------------------------------------

        const secSsl = new FfrSection(body, 'SSL');
        this._sslTabBadge = jQuery('<span class="badge badge-success">&nbsp;<i class="fa fa-check-circle"></i>&nbsp;</span>')
            .appendTo(secSsl.element.children('legend'));
        this._sslTabBadge.hide();

        this._switchSslEnable = new FfrSwitch('SSL Enable', false);
        secSsl.element.append(this._switchSslEnable.element);

        this._sslArea = jQuery('<div></div>').appendTo(secSsl.element);
        this._sslArea.hide();

        // ssl provider
        const secSslProvider = new FfrSection(this._sslArea, 'Provider');
        this._secSslProvider = secSslProvider.element;

        const rowProvider = FfrField.row(secSslProvider.element);

        this._selectSslProvider = new FfrSelect();
        new FfrField(rowProvider, 'SSL Provider').mount(this._selectSslProvider.element);

        this._switchSslWildcard = new FfrSwitch('Wildcard', false);
        new FfrField(rowProvider, 'Wildcard').mount(this._switchSslWildcard.element);
        this._setSwitchInactive(this._switchSslWildcard, true);

        this._inputSslEmail = new FfrInput(false, 'admin@flyingfish.org');
        this._inputSslEmail.element.attr('readonly', 'readonly');
        new FfrField(secSslProvider.element, 'SSL EMail').mount(this._inputSslEmail.element);

        // ssl certificates
        const secSslCert = new FfrSection(this._sslArea, 'Certificates');
        this._secSslCert = secSslCert.element;

        this._selectSslWildcardCert = new FfrSelect();
        new FfrField(secSslCert.element, 'Wildcard Certificate from Domain').mount(this._selectSslWildcardCert.element);

        this._selectSslWildcardCert.onChange((value) => {
            if (value === '0') {
                this._secSslProvider.show();
            } else {
                this._secSslProvider.hide();
            }
        });

        this._selectSslProvider.onChange((value) => {
            this._setSwitchInactive(this._switchSslWildcard, true);
            this._setInputReadOnly(this._inputSslEmail, true);

            if (value === '') {
                this._secSslCert.show();
            } else {
                this._secSslCert.hide();

                // reset
                this.setWildcardCertificate(0);
            }

            for (const provider of this._sslProviderList) {
                if (provider.name === value) {
                    if (provider.options.email_required) {
                        this._setInputReadOnly(this._inputSslEmail, false);
                    }

                    if (provider.options.wildcardSupported) {
                        this._setSwitchInactive(this._switchSslWildcard, false);
                    }

                    break;
                }
            }
        });

        // ssl cert details
        this._sslCertDetails = new Card(this._sslArea, CardBodyType.none, CardType.primary, CardLine.none);
        // eslint-disable-next-line no-new
        new Icon(this._sslCertDetails.getTitleElement(), IconFa.certificate);
        this._sslCertDetails.getTitleElement().append('&nbsp;Certificate Details');
        this._sslCertDetails.hide();

        this._switchSslEnable.element.on('click', () => {
            this._applySslEnable();
        });

        // location ----------------------------------------------------------------------------------------------------

        const secLocation = new FfrSection(body, 'Location');
        this._locationTabBadge = jQuery('<span class="badge badge-success">0</span>')
            .appendTo(secLocation.element.children('legend'));
        this._locationTabBadge.hide();

        this._locationCollection = new LocationListWidget(secLocation.element, () => {
            this._updateLocationTabBadge();
        }, true);

        // advanced ----------------------------------------------------------------------------------------------------

        const secAdvanced = new FfrSection(body, 'Advanced');

        this._switchHttp2Enable = new FfrSwitch('HTTP2 Enable', false);
        secAdvanced.element.append(this._switchHttp2Enable.element);
        this._setSwitchInactive(this._switchHttp2Enable, true);

        this._switchWellknownDisabled = new FfrSwitch('well-known disabled', false);
        secAdvanced.element.append(this._switchWellknownDisabled.element);

        this._selectXFrameOptions = new FfrSegmented([
            {key: '', label: 'None'},
            {key: 'SAMEORIGIN', label: 'SAMEORIGIN'},
            {key: 'DENY', label: 'DENY'}
        ], '');
        new FfrField(secAdvanced.element, 'X-Frame-Options').mount(this._selectXFrameOptions.element);

        this._inputVariableCmbs = new FfrInput(true, '1');
        new FfrField(secAdvanced.element, 'Client max body size (MB)').mount(this._inputVariableCmbs.element);
    }

    /**
     * Toggle a switch between the active and inactive (disabled) look.
     * @param sw - the switch widget
     * @param inactive - whether the switch should be inactive
     * @protected
     */
    protected _setSwitchInactive(sw: FfrSwitch, inactive: boolean): void {
        sw.element.css({
            'pointer-events': inactive ? 'none' : '',
            'opacity': inactive ? '0.5' : ''
        });
    }

    /**
     * Toggle an input's read-only state.
     * @param input - the input widget
     * @param readonly - whether the input should be read-only
     * @protected
     */
    protected _setInputReadOnly(input: FfrInput, readonly: boolean): void {
        if (readonly) {
            input.element.attr('readonly', 'readonly');
        } else {
            input.element.removeAttr('readonly');
        }
    }

    /**
     * Apply the SSL enable state: show/hide the SSL area and (when editing) load the
     * certificate details. Replaces the former bambooo Switch change handler.
     * @protected
     */
    protected async _applySslEnable(): Promise<void> {
        const value = this._switchSslEnable.isOn();

        this._setSwitchInactive(this._switchHttp2Enable, true);
        this._sslArea.hide();
        this._sslCertDetails.hide();
        this._updateSSLTabBadge();

        if (value) {
            this._setSwitchInactive(this._switchHttp2Enable, false);
            this._sslArea.show();

            if (this._id) {
                this._sslCertDetails.show();
                this._sslCertDetails.emptyBody();

                const certDetails = await SslAPI.getCertDetails(this._id);

                if (certDetails) {
                    // Issuer ------------------------------------------------------------------------------------------
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

                    // subject -----------------------------------------------------------------------------------------

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

                    // serial number -----------------------------------------------------------------------------------
                    const strongSerial = new StrongText(this._sslCertDetails);
                    // eslint-disable-next-line no-new
                    new Icon(strongSerial, IconFa.lock);
                    strongSerial.getElement().append('&nbsp;Serial');

                    const pSerial = new PText(this._sslCertDetails, PTextType.muted);
                    pSerial.getElement().append(certDetails.serialNumber);

                    this._sslCertDetails.getElement().append('<hr>');

                    // signatureAlgo -----------------------------------------------------------------------------------

                    const strongSigAlgo = new StrongText(this._sslCertDetails);
                    // eslint-disable-next-line no-new
                    new Icon(strongSigAlgo, IconFa.lock);
                    strongSigAlgo.getElement().append('&nbsp;Signature Algorithm');

                    const pSigAlg = new PText(this._sslCertDetails, PTextType.muted);
                    pSigAlg.getElement().append(certDetails.signatureAlgorithm);

                    this._sslCertDetails.getElement().append('<hr>');

                    // valid from/to -----------------------------------------------------------------------------------
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

                    // extensions --------------------------------------------------------------------------------------

                    const strongExtensions = new StrongText(this._sslCertDetails);
                    // eslint-disable-next-line no-new
                    new Icon(strongExtensions, IconFa.bars);
                    strongExtensions.getElement().append('&nbsp;Extensions');

                    const tableExtensions = new Table(this._sslCertDetails);

                    for (const ext of certDetails.extensions) {
                        const trExt = new Tr(tableExtensions);

                        // eslint-disable-next-line no-new
                        new Td(trExt, `<b>${ext}</b>`);
                    }
                }
            }
        }
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

        const options: {key: string; value: string;}[] = [{
            key: '0',
            value: 'Please select your Listen'
        }];

        for (const alisten of this._listens) {
            if (alisten.routeless) {
                // eslint-disable-next-line no-continue
                continue;
            }

            const type = alisten.type === ListenTypes.stream ? 'Stream' : 'HTTP';

            if (alisten.type === this._type) {
                options.push({
                    key: `${alisten.id}`,
                    value: `${alisten.name} - ${alisten.port} (${type})`
                });
            }
        }

        this._selectListen.setValues(options);
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
            this._locationTabBadge.show().text(`${count}`);
        } else {
            this._locationTabBadge.hide();
        }
    }

    /**
     * Update the SSL tab badge
     * @protected
     */
    protected _updateSSLTabBadge(): void {
        if (this._switchSslEnable.isOn()) {
            this._sslTabBadge.show();
        } else {
            this._sslTabBadge.hide();
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
        this._switchSslEnable.setOn(enable);
        this._applySslEnable();
        this._setSwitchInactive(this._switchHttp2Enable, false);
    }

    /**
     * getSslEnable
     */
    public getSslEnable(): boolean {
        return this._switchSslEnable.isOn();
    }

    /**
     * setSslProviders
     * @param providers
     */
    public setSslProviders(providers: ProviderSslEntry[]): void {
        this._sslProviderList = providers;

        const options: {key: string; value: string;}[] = [{
            key: '',
            value: 'Please select your Provider'
        }];

        for (const provider of providers) {
            options.push({
                key: provider.name,
                value: provider.title
            });
        }

        this._selectSslProvider.setValues(options);
    }

    /**
     * setSslProvider
     * @param provider
     */
    public setSslProvider(provider: string): void {
        this._selectSslProvider.setSelectedValue(provider);
        this._selectSslProvider.element.trigger('change');
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
     * Set ssl wildcard enable
     * @param {boolean} enable
     */
    public setSslWildcard(enable: boolean): void {
        this._switchSslWildcard.setOn(enable);
    }

    /**
     * Return the Ssl Wildcard is used
     * @return {boolean}
     */
    public getSslWildcard(): boolean {
        return this._switchSslWildcard.isOn();
    }

    /**
     * setHttp2Enable
     * @param enable
     */
    public setHttp2Enable(enable: boolean): void {
        this._switchHttp2Enable.setOn(enable);
    }

    /**
     * getHttp2Enable
     */
    public getHttp2Enable(): boolean {
        return this._switchHttp2Enable.isOn();
    }

    /**
     * setXFrameOptions
     * @param option
     */
    public setXFrameOptions(option: string): void {
        this._selectXFrameOptions.setValue(option);
    }

    /**
     * getXFrameOptions
     */
    public getXFrameOptions(): string {
        return this._selectXFrameOptions.getValue();
    }

    /**
     * setWellKnownDisabled
     * @param disabled
     */
    public setWellKnownDisabled(disabled: boolean): void {
        this._switchWellknownDisabled.setOn(disabled);
    }

    /**
     * getWellKnwonDisabled
     */
    public getWellKnwonDisabled(): boolean {
        return this._switchWellknownDisabled.isOn();
    }

    /**
     * Fill Wildcard List
     * @param list
     */
    public setWildcardCertificateList(list: SslListWildcardEntry[]): void {
        const options: {key: string; value: string;}[] = [{
            key: '0',
            value: list.length === 0 ? 'None Certificates found' : 'Not select'
        }];

        for (const wcert of list) {
            options.push({
                key: `${wcert.owern_http_id}`,
                value: wcert.label
            });
        }

        this._selectSslWildcardCert.setValues(options);
    }

    /**
     * Set wildcard certificate
     * @param {number} ownerHttpId
     */
    public setWildcardCertificate(ownerHttpId: number): void {
        this._selectSslWildcardCert.setSelectedValue(`${ownerHttpId}`);
        this._selectSslWildcardCert.element.trigger('change');
    }

    /**
     * Return wildcard certificate
     * @return {number}
     */
    public getWildcardCertificate(): number {
        return parseInt(this._selectSslWildcardCert.getSelectedValue(), 10) || 0;
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
        this.setSslWildcard(false);
        this.setSslEmail('');
        this.setWildcardCertificate(0);
        this._setSwitchInactive(this._switchHttp2Enable, true);
        this.setHttp2Enable(false);
        this.setXFrameOptions('');
        this._inputVariableCmbs.setValue('');
        this._locationCollection.removeAll();
    }

}
