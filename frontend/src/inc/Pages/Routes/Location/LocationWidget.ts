import {
    ButtonClass,
    ButtonDefault, ButtonDefaultType,
    Card,
    CardBodyType,
    CardType,
    FormGroup, FormRow,
    ICollectionEntryWidget,
    InputBottemBorderOnly2, InputType, Multiple,
    NavTab,
    SelectBottemBorderOnly2, Switch, Textarea, Tooltip, TooltipInfo
} from 'bambooo';
import {Credential, Location, LocationCredential, SshPortEntry} from 'flyingfish_schemas';
import {NginxLocationDestinationTypes} from '../../../Api/Route.js';
import {Lang} from '../../../Lang.js';
import {UtilNumber} from '../../../Utils/UtilNumber.js';
import {LocationListWidget} from './LocationListWidget.js';

/**
 * Location Widget
 */
export class LocationWidget extends Card implements ICollectionEntryWidget {

    /**
     * TabIndex
     */
    public static _tabIndex = 0;

    /**
     * nav tab
     * @protected
     */
    protected _navTab: NavTab;

    /**
     * location
     * @protected
     */
    protected _location: Location|null = null;

    /**
     * input match
     * @protected
     */
    protected _inputMatch: InputBottemBorderOnly2;

    /**
     * Destination type
     * @protected
     */
    protected _selectDestinationType: SelectBottemBorderOnly2;

    /**
     * input proxy pass
     * @protected
     */
    protected _inputProxyPass: InputBottemBorderOnly2;

    /**
     * input redirect code
     * @protected
     */
    protected _inputRedirectCode: InputBottemBorderOnly2;

    /**
     * input redirect path
     * @protected
     */
    protected _inputRedirectPath: InputBottemBorderOnly2;

    /**
     * select ssh schema
     * @protected
     */
    protected _selectSshSchema: SelectBottemBorderOnly2;

    /**
     * select ssh listen
     * @protected
     */
    protected _selectSshListen: SelectBottemBorderOnly2;

    /**
     * switch websocket
     * @protected
     */
    protected _switchWebSocket: Switch;

    /**
     * switch auth
     * @protected
     */
    protected _switchAuth: Switch;

    /**
     * switch header host
     * @protected
     */
    protected _switchHeaderHost: Switch;

    /**
     * select credential authentication
     * @protected
     */
    protected _selectCredAuth: Multiple;

    /**
     * switch jwt auth (nginx-native Phase F)
     * @protected
     */
    protected _switchJwtAuth: Switch;

    /**
     * select jwt algorithm
     * @protected
     */
    protected _selectJwtAlg: SelectBottemBorderOnly2;

    /**
     * input jwt secret (HS256)
     * @protected
     */
    protected _inputJwtSecret: InputBottemBorderOnly2;

    /**
     * textarea jwt public key PEM (asymmetric)
     * @protected
     */
    protected _textareaJwtKey: Textarea;

    /**
     * input jwt issuer
     * @protected
     */
    protected _inputJwtIss: InputBottemBorderOnly2;

    /**
     * input jwt audience
     * @protected
     */
    protected _inputJwtAud: InputBottemBorderOnly2;

    /**
     * input jwt required claim (name:value)
     * @protected
     */
    protected _inputJwtRequire: InputBottemBorderOnly2;

    /**
     * input jwt leeway (seconds)
     * @protected
     */
    protected _inputJwtLeeway: InputBottemBorderOnly2;

    /**
     * refresh the jwt config field visibility (enable switch + algorithm)
     * @protected
     */
    protected _updateJwtVisibility!: () => void;

    /**
     * input header host name
     * @protected
     */
    protected _inputHeaderHostName: InputBottemBorderOnly2;

    /**
     * input header host port
     * @protected
     */
    protected _inputHeaderHostPort: InputBottemBorderOnly2;

    /**
     * switch x forwarded scheme
     * @protected
     */
    protected _switchXForwardedScheme: Switch;

    /**
     * switch x forwareded proto
     * @protected
     */
    protected _switchXForwardedProto: Switch;

    /**
     * switch x forwareded for
     * @protected
     */
    protected _switchXForwardedFor: Switch;

    /**
     * switch x real ip
     * @protected
     */
    protected _switchXrealip: Switch;

    /**
     * Constructor
     * @param {LocationListWidget} element
     * @param {boolean} editable
     */
    public constructor(element: LocationListWidget, editable: boolean = false) {
        super(element.getElement(), CardBodyType.none, CardType.success);

        LocationWidget._tabIndex++;
        this._navTab = new NavTab(this, 'routehttplocationnavtab');
        const tabDetails = this._navTab.addTab('Details', `routehttplocationdetails${LocationWidget._tabIndex}`);
        const tabAdvanced = this._navTab.addTab('Advanced', `routehttplocationadvanced${LocationWidget._tabIndex}`);

        // tab deatils -------------------------------------------------------------------------------------------------
        const bodyCard = jQuery('<div class="card-body"/>').appendTo(tabDetails.body);

        const groupMatch = new FormGroup(bodyCard, 'Match');
        this._inputMatch = new InputBottemBorderOnly2(groupMatch);
        this._inputMatch.setPlaceholder('/');

        const groupDesType = new FormGroup(bodyCard, 'Destination-Type');
        this._selectDestinationType = new SelectBottemBorderOnly2(groupDesType);

        this._selectDestinationType.addValue({
            key: `${NginxLocationDestinationTypes.none}`,
            value: 'Please select a destination type'
        });

        this._selectDestinationType.addValue({
            key: `${NginxLocationDestinationTypes.proxypass}`,
            value: 'Proxy Pass'
        });

        this._selectDestinationType.addValue({
            key: `${NginxLocationDestinationTypes.redirect}`,
            value: 'Redirect'
        });

        this._selectDestinationType.addValue({
            key: `${NginxLocationDestinationTypes.ssh}`,
            value: 'SSH Server (FlyingFish Service)'
        });

        this._selectDestinationType.addValue({
            key: `${NginxLocationDestinationTypes.dyndns}`,
            value: 'DynDNS Server (FlyingFish Service)'
        });

        /*
         *this._selectDestinationType.addValue({
         *  key: `${NginxLocationDestinationTypes.vpn}`,
         *  value: 'VPN Server (FlyingFish Service)'
         *});
         */

        // proxy pass --------------------------------------------------------------------------------------------------

        const groupProxyPass = new FormGroup(bodyCard, 'Proxy Pass');
        this._inputProxyPass = new InputBottemBorderOnly2(groupProxyPass);
        this._inputProxyPass.setPlaceholder('http://<ip>/');
        groupProxyPass.hide();

        // redirect ----------------------------------------------------------------------------------------------------

        const rowRed = new FormRow(bodyCard);
        rowRed.hide();

        const groupRedCode = new FormGroup(rowRed.createCol(4), 'Redirect-Code');
        this._inputRedirectCode = new InputBottemBorderOnly2(groupRedCode, undefined, InputType.number);
        this._inputRedirectCode.setValue('301');

        const groupRedPath = new FormGroup(rowRed.createCol(8), 'Redirect-Path');
        this._inputRedirectPath = new InputBottemBorderOnly2(groupRedPath);
        this._inputRedirectPath.setPlaceholder('https://<domain>/path');

        // ssh ---------------------------------------------------------------------------------------------------------

        const rowSsh = new FormRow(bodyCard);
        rowSsh.hide();

        const groupSshSchema = new FormGroup(rowSsh.createCol(4), 'Schema');
        this._selectSshSchema = new SelectBottemBorderOnly2(groupSshSchema);

        this._selectSshSchema.addValue({
            key: 'http',
            value: 'HTTP'
        });

        this._selectSshSchema.addValue({
            key: 'https',
            value: 'HTTPS'
        });

        const groupSshListen = new FormGroup(rowSsh.createCol(8), 'Ssh Listen');
        this._selectSshListen = new SelectBottemBorderOnly2(groupSshListen);

        // -------------------------------------------------------------------------------------------------------------

        this._selectDestinationType.setChangeFn((value) => {
            const selected = parseInt(value, 10) ?? NginxLocationDestinationTypes.none;

            groupProxyPass.hide();
            rowRed.hide();
            rowSsh.hide();

            switch (selected) {
                case NginxLocationDestinationTypes.proxypass:
                    groupProxyPass.show();
                    break;

                case NginxLocationDestinationTypes.redirect:
                    rowRed.show();
                    break;

                case NginxLocationDestinationTypes.ssh:
                    rowSsh.show();
                    break;
            }
        });

        // tab advanced ------------------------------------------------------------------------------------------------
        const bodyCardAdv = jQuery('<div class="card-body"/>').appendTo(tabAdvanced.body);
        const enableL1 = new FormRow(bodyCardAdv);

        const groupEnableWebSocket = new FormGroup(enableL1.createCol(6), 'Websocket Enable');
        this._switchWebSocket = new Switch(groupEnableWebSocket, 'locwebsocket');

        const groupEnableAuth = new FormGroup(enableL1.createCol(6), 'Authentication Enable');
        this._switchAuth = new Switch(groupEnableAuth, 'locauth');

        const rowHost = new FormRow(bodyCardAdv);

        const groupEnableHeaderHost = new FormGroup(rowHost.createCol(6), 'Header Host Enable');
        this._switchHeaderHost = new Switch(groupEnableHeaderHost, 'locheaderhost');

        const groupCredAuth = new FormGroup(rowHost.createCol(6), 'Authentication Credentials');
        this._selectCredAuth = new Multiple(groupCredAuth);
        this._switchAuth.setChangeFn(async(value): Promise<void> => {
            if (value) {
                groupCredAuth.show();
            } else {
                groupCredAuth.hide();
            }
        });

        // jwt auth (nginx-native Phase F) -----------------------------------------------------------------------------
        const rowJwt = new FormRow(bodyCardAdv);

        const groupEnableJwt = new FormGroup(rowJwt.createCol(6), 'JWT Authentication Enable');
        this._switchJwtAuth = new Switch(groupEnableJwt, 'locjwtauth');

        const groupJwtAlg = new FormGroup(rowJwt.createCol(6), 'JWT Algorithm');
        this._selectJwtAlg = new SelectBottemBorderOnly2(groupJwtAlg);
        this._selectJwtAlg.addValue({key: 'HS256', value: 'HS256 (shared secret)'});
        this._selectJwtAlg.addValue({key: 'RS256', value: 'RS256 (public key)'});
        this._selectJwtAlg.addValue({key: 'ES256', value: 'ES256 (public key)'});
        this._selectJwtAlg.addValue({key: 'EdDSA', value: 'EdDSA (public key)'});

        const groupJwtSecret = new FormGroup(bodyCardAdv, 'JWT Secret (HS256)');
        this._inputJwtSecret = new InputBottemBorderOnly2(groupJwtSecret);
        this._inputJwtSecret.setPlaceholder('shared HMAC secret');

        const groupJwtKey = new FormGroup(bodyCardAdv, 'JWT Public Key (PEM)');
        this._textareaJwtKey = new Textarea(groupJwtKey, '-----BEGIN PUBLIC KEY-----', 5);

        const rowJwtClaims = new FormRow(bodyCardAdv);

        const groupJwtIss = new FormGroup(rowJwtClaims.createCol(6), 'JWT Issuer (iss)');
        this._inputJwtIss = new InputBottemBorderOnly2(groupJwtIss);
        this._inputJwtIss.setPlaceholder('optional, empty = unchecked');

        const groupJwtAud = new FormGroup(rowJwtClaims.createCol(6), 'JWT Audience (aud)');
        this._inputJwtAud = new InputBottemBorderOnly2(groupJwtAud);
        this._inputJwtAud.setPlaceholder('optional, empty = unchecked');

        const rowJwtClaims2 = new FormRow(bodyCardAdv);

        const groupJwtRequire = new FormGroup(rowJwtClaims2.createCol(6), 'JWT Required Claim');
        this._inputJwtRequire = new InputBottemBorderOnly2(groupJwtRequire);
        this._inputJwtRequire.setPlaceholder('name:value, e.g. scope:admin');

        const groupJwtLeeway = new FormGroup(rowJwtClaims2.createCol(6), 'JWT Leeway (seconds)');
        this._inputJwtLeeway = new InputBottemBorderOnly2(groupJwtLeeway, undefined, InputType.number);
        this._inputJwtLeeway.setValue('0');

        // show/hide the jwt config on the enable switch; secret vs key file by algorithm
        const updateJwtVisibility = (): void => {
            const on = this._switchJwtAuth.isEnable();
            const alg = this._selectJwtAlg.getSelectedValue();

            if (on) {
                groupJwtAlg.show();
                rowJwtClaims.show();
                rowJwtClaims2.show();

                if (alg === 'HS256') {
                    groupJwtSecret.show();
                    groupJwtKey.hide();
                } else {
                    groupJwtSecret.hide();
                    groupJwtKey.show();
                }
            } else {
                groupJwtAlg.hide();
                groupJwtSecret.hide();
                groupJwtKey.hide();
                rowJwtClaims.hide();
                rowJwtClaims2.hide();
            }
        };

        this._updateJwtVisibility = updateJwtVisibility;
        this._switchJwtAuth.setChangeFn(async(): Promise<void> => updateJwtVisibility());
        this._selectJwtAlg.setChangeFn(() => updateJwtVisibility());
        updateJwtVisibility();

        const rowHostOptions = new FormRow(bodyCardAdv);
        const groupHeaderHostName = new FormGroup(rowHostOptions.createCol(6), 'Header Hostname');
        this._inputHeaderHostName = new InputBottemBorderOnly2(groupHeaderHostName);
        this._inputHeaderHostName.setPlaceholder('Bypass a Hostname, empty set by $host');

        const groupHeaderHostPort = new FormGroup(rowHostOptions.createCol(6), 'Header Port');
        // eslint-disable-next-line no-new
        new TooltipInfo(groupHeaderHostPort.getLabelElement(), Lang.i().l('route_http_location_headerhostport'));
        this._inputHeaderHostPort = new InputBottemBorderOnly2(groupHeaderHostPort);
        this._inputHeaderHostPort.setPlaceholder('443');

        const enableL3 = new FormRow(bodyCardAdv);

        const groupEnableXForwardedScheme = new FormGroup(enableL3.createCol(6), 'X-Forwarded Scheme');
        this._switchXForwardedScheme = new Switch(groupEnableXForwardedScheme, 'locxforwarededscheme');

        const groupEnableXForwardedProto = new FormGroup(enableL3.createCol(6), 'X-Forwarded Proto');
        this._switchXForwardedProto = new Switch(groupEnableXForwardedProto, 'locxforwarededproto');

        const enableL4 = new FormRow(bodyCardAdv);

        const groupEnableXForwardedFor = new FormGroup(enableL4.createCol(6), 'X-Forwarded For');
        this._switchXForwardedFor = new Switch(groupEnableXForwardedFor, 'locxforwarededfor');

        const groupEnableXrealip = new FormGroup(enableL4.createCol(6), 'X-Real IP');
        this._switchXrealip = new Switch(groupEnableXrealip, 'locxrealip');

        // buttons -----------------------------------------------------------------------------------------------------

        const removeUpstreamBtn = new ButtonDefault(
            this.getToolsElement(),
            '',
            'fa-trash',
            ButtonClass.tool,
            ButtonDefaultType.none
        );

        removeUpstreamBtn.setOnClickFn(() => {
            element.removeLocation(this);
        });

        // init tooltips
        Tooltip.init();

        this.setReadOnly(!editable);
    }

    /**
     * setMatch
     * @param match
     */
    public setMatch(match: string): void {
        this._inputMatch.setValue(match);
    }

    /**
     * getMatch
     */
    public getMatch(): string {
        return this._inputMatch.getValue();
    }

    /**
     * setDestinationType
     * @param type
     */
    public setDestinationType(type: NginxLocationDestinationTypes): void {
        this._selectDestinationType.setSelectedValue(`${type}`);
    }

    /**
     * getDestinationType
     */
    public getDestinationType(): number {
        return parseInt(this._selectDestinationType.getSelectedValue(), 10) ?? 0;
    }

    /**
     * setProxyPass
     * @param proxypass
     */
    public setProxyPass(proxypass: string): void {
        this._inputProxyPass.setValue(proxypass);
    }

    /**
     * getProxyPass
     */
    public getProxyPass(): string {
        return this._inputProxyPass.getValue();
    }

    /**
     * setRedirectCode
     * @param code
     */
    public setRedirectCode(code: number): void {
        this._inputRedirectCode.setValue(`${code}`);
    }

    /**
     * getRedirectCode
     */
    public getRedirectCode(): number {
        return parseInt(this._inputRedirectCode.getValue(), 10) || 0;
    }

    /**
     * setRedirectPath
     * @param redirect
     */
    public setRedirectPath(redirect: string): void {
        this._inputRedirectPath.setValue(redirect);
    }

    /**
     * getRedirectPath
     */
    public getRedirectPath(): string {
        return this._inputRedirectPath.getValue();
    }

    /**
     * setSshSchema
     * @param schema
     */
    public setSshSchema(schema: string): void {
        this._selectSshSchema.setSelectedValue(schema);
    }

    /**
     * getSshSchema
     */
    public getSshSchema(): string {
        return this._selectSshSchema.getSelectedValue();
    }

    /**
     * setSshListens
     * @param {SshPortEntry[]} listens
     */
    public setSshListens(listens: SshPortEntry[]): void {
        this._selectSshListen.clearValues();
        this._selectSshListen.addValue({
            key: '0',
            value: 'Please select your ssh listen!'
        });

        for (const entry of listens) {
            this._selectSshListen.addValue({
                key: `${entry.id}`,
                value: `SSH INTERNT OUT (<-- ${entry.port})`
            });
        }
    }

    /**
     * setSshListen
     * @param listen
     */
    public setSshListen(listen: string): void {
        this._selectSshListen.setSelectedValue(listen);
    }

    /**
     * getSshListen
     */
    public getSshListen(): number {
        const value = this._selectSshListen.getSelectedValue();
        return UtilNumber.getNumber(value);
    }

    /**
     * setEnableWebsocket
     * @param enable
     */
    public setEnableWebsocket(enable: boolean): void {
        this._switchWebSocket.setEnable(enable);
    }

    /**
     * getEnableWebsocket
     */
    public getEnableWebsocket(): boolean {
        return this._switchWebSocket.isEnable();
    }

    /**
     * setEnableAuth
     * @param enable
     */
    public setEnableAuth(enable: boolean): void {
        this._switchAuth.setEnable(enable);
    }

    /**
     * getEnableAuth
     */
    public getEnableAuth(): boolean {
        return this._switchAuth.isEnable();
    }

    /**
     * setJwtEnable
     * @param enable
     */
    public setJwtEnable(enable: boolean): void {
        this._switchJwtAuth.setEnable(enable);
    }

    /**
     * getJwtEnable
     */
    public getJwtEnable(): boolean {
        return this._switchJwtAuth.isEnable();
    }

    /**
     * setJwtAlg
     * @param alg
     */
    public setJwtAlg(alg: string): void {
        this._selectJwtAlg.setSelectedValue(alg || 'HS256');
    }

    /**
     * getJwtAlg
     */
    public getJwtAlg(): string {
        return this._selectJwtAlg.getSelectedValue();
    }

    /**
     * setJwtSecret
     * @param secret
     */
    public setJwtSecret(secret: string): void {
        this._inputJwtSecret.setValue(secret);
    }

    /**
     * getJwtSecret
     */
    public getJwtSecret(): string {
        return this._inputJwtSecret.getValue();
    }

    /**
     * setJwtPublicKey
     * @param key
     */
    public setJwtPublicKey(key: string): void {
        this._textareaJwtKey.setValue(key);
    }

    /**
     * getJwtPublicKey
     */
    public getJwtPublicKey(): string {
        return this._textareaJwtKey.getValue();
    }

    /**
     * setJwtIss
     * @param iss
     */
    public setJwtIss(iss: string): void {
        this._inputJwtIss.setValue(iss);
    }

    /**
     * getJwtIss
     */
    public getJwtIss(): string {
        return this._inputJwtIss.getValue();
    }

    /**
     * setJwtAud
     * @param aud
     */
    public setJwtAud(aud: string): void {
        this._inputJwtAud.setValue(aud);
    }

    /**
     * getJwtAud
     */
    public getJwtAud(): string {
        return this._inputJwtAud.getValue();
    }

    /**
     * setJwtRequire
     * @param require
     */
    public setJwtRequire(require: string): void {
        this._inputJwtRequire.setValue(require);
    }

    /**
     * getJwtRequire
     */
    public getJwtRequire(): string {
        return this._inputJwtRequire.getValue();
    }

    /**
     * setJwtLeeway
     * @param leeway
     */
    public setJwtLeeway(leeway: number): void {
        this._inputJwtLeeway.setValue(`${leeway}`);
    }

    /**
     * getJwtLeeway
     */
    public getJwtLeeway(): number {
        return parseInt(this._inputJwtLeeway.getValue(), 10) || 0;
    }

    /**
     * setHeaderHostEnable
     * @param enable
     */
    public setHeaderHostEnable(enable: boolean): void {
        this._switchHeaderHost.setEnable(enable);
    }

    /**
     * getHeaderHostEnable
     */
    public getHeaderHostEnable(): boolean {
        return this._switchHeaderHost.isEnable();
    }

    /**
     * setHeaderHostName
     * @param name
     */
    public setHeaderHostName(name: string): void {
        this._inputHeaderHostName.setValue(name);
    }

    /**
     * getHeaderHostName
     */
    public getHeaderHostName(): string {
        return this._inputHeaderHostName.getValue();
    }

    /**
     * setHeaderHostPort
     * @param port
     */
    public setHeaderHostPort(port: number): void {
        this._inputHeaderHostPort.setValue(port > 0 ? `${port}` : '');
    }

    /**
     * getHeaderHostPort
     */
    public getHeaderHostPort(): number {
        return parseInt(this._inputHeaderHostPort.getValue(), 10) || 0;
    }

    /**
     * setXForwardedSchemeEnable
     * @param enable
     */
    public setXForwardedSchemeEnable(enable: boolean): void {
        this._switchXForwardedScheme.setEnable(enable);
    }

    /**
     * getXForwardedSchemeEnable
     */
    public getXForwardedSchemeEnable(): boolean {
        return this._switchXForwardedScheme.isEnable();
    }

    /**
     * setXForwardedProtoEnable
     * @param enable
     */
    public setXForwardedProtoEnable(enable: boolean): void {
        this._switchXForwardedProto.setEnable(enable);
    }

    /**
     * getXForwardedProtoEnable
     */
    public getXForwardedProtoEnable(): boolean {
        return this._switchXForwardedProto.isEnable();
    }

    /**
     * setXForwardedForEnable
     * @param enable
     */
    public setXForwardedForEnable(enable: boolean): void {
        this._switchXForwardedFor.setEnable(enable);
    }

    /**
     * getXForwardedForEnable
     */
    public getXForwardedForEnable(): boolean {
        return this._switchXForwardedFor.isEnable();
    }

    /**
     * setXrealipEnable
     * @param enable
     */
    public setXrealipEnable(enable: boolean): void {
        this._switchXrealip.setEnable(enable);
    }

    /**
     * getXrealipEnable
     */
    public getXrealipEnable(): boolean {
        return this._switchXrealip.isEnable();
    }

    public setCredentials(credentials: LocationCredential[]): void {
        const list: string[] = [];

        for (const entry of credentials) {
            list.push(`${entry.id}`);
        }

        this._selectCredAuth.setValue(list);
    }

    /**
     * Set the credential values
     * @param {Credential[]} list
     */
    public setCredentialValues(list: Credential[]): void {
        for (const credential of list) {
            this._selectCredAuth.addValue({
                key: `${credential.id}`,
                value: credential.name
            });
        }
    }

    /**
     * Return the selected crdentials
     */
    public getCredentials(): LocationCredential[] {
        const list: LocationCredential[] = [];

        const values = this._selectCredAuth.getValue();

        for (const value of values) {
            list.push({
                id: parseInt(value, 10),
                name: ''
            });
        }

        return list;
    }

    /**
     * setLocation
     * @param location
     */
    public setLocation(location: Location): void {
        this._location = location;

        this.setTitle(`#${location.id}`);

        this.setMatch(location.match);
        this.setEnableWebsocket(location.websocket_enable);
        this.setEnableAuth(location.auth_enable);
        this.setCredentials(location.credentials);
        this.setJwtEnable(location.jwt_auth_enable ?? false);
        this.setJwtAlg(location.jwt_alg ?? 'HS256');
        this.setJwtSecret(location.jwt_secret ?? '');
        this.setJwtPublicKey(location.jwt_public_key ?? '');
        this.setJwtIss(location.jwt_iss ?? '');
        this.setJwtAud(location.jwt_aud ?? '');
        this.setJwtRequire(location.jwt_require ?? '');
        this.setJwtLeeway(location.jwt_leeway ?? 0);
        this._updateJwtVisibility();
        this.setHeaderHostEnable(location.host_enable);
        this.setHeaderHostName(location.host_name);
        this.setHeaderHostPort(location.host_name_port);
        this.setXForwardedSchemeEnable(location.xforwarded_scheme_enable);
        this.setXForwardedProtoEnable(location.xforwarded_proto_enable);
        this.setXForwardedForEnable(location.xforwarded_for_enable);
        this.setXrealipEnable(location.xrealip_enable);
        this.setDestinationType(location.destination_type);

        if (location.proxy_pass !== '') {
            this.setProxyPass(location.proxy_pass);
        } else if (location.ssh && location.ssh.port_out) {
            this.setSshSchema(`${location.ssh.schema}`);
            this.setSshListen(`${location.ssh.id}`);
        } else if (location.redirect && (location.redirect.redirect !== '')) {
            this.setRedirectCode(location.redirect.code);
            this.setRedirectPath(location.redirect.redirect);
        }
    }

    /**
     * Return all form data to a location object
     * @returns {Location}
     */
    public getLocation(): Location {
        const tlocation: Location = {
            id: this._location!.id,
            destination_type: this.getDestinationType(),
            match: this.getMatch(),
            proxy_pass: '',
            auth_enable: this.getEnableAuth(),
            credentials: this.getCredentials(),
            jwt_auth_enable: this.getJwtEnable(),
            jwt_alg: this.getJwtAlg(),
            jwt_secret: this.getJwtSecret(),
            jwt_public_key: this.getJwtPublicKey(),
            jwt_iss: this.getJwtIss(),
            jwt_aud: this.getJwtAud(),
            jwt_require: this.getJwtRequire(),
            jwt_leeway: this.getJwtLeeway(),
            websocket_enable: this.getEnableWebsocket(),
            host_enable: this.getHeaderHostEnable(),
            host_name: this.getHeaderHostName(),
            host_name_port: this.getHeaderHostPort(),
            xforwarded_scheme_enable: this.getXForwardedSchemeEnable(),
            xforwarded_proto_enable: this.getXForwardedProtoEnable(),
            xforwarded_for_enable: this.getXForwardedForEnable(),
            xrealip_enable: this.getXrealipEnable(),
            variables: []
        };

        switch (this.getDestinationType()) {
            case NginxLocationDestinationTypes.proxypass:
                tlocation.proxy_pass = this.getProxyPass();
                break;

            case NginxLocationDestinationTypes.redirect:
                tlocation.redirect = {
                    code: this.getRedirectCode(),
                    redirect: this.getRedirectPath()
                };
                break;

            case NginxLocationDestinationTypes.ssh:
                tlocation.ssh = {
                    schema: this.getSshSchema(),
                    id: this.getSshListen()
                };
                break;
        }

        return tlocation;
    }

    /**
     * Set readonly
     * @param readOnly
     */
    public setReadOnly(readOnly: boolean): void {
        this._inputMatch.setReadOnly(readOnly);
        this._inputProxyPass.setReadOnly(readOnly);
        this._inputRedirectCode.setReadOnly(readOnly);
        this._inputRedirectPath.setReadOnly(readOnly);
        this._switchHeaderHost.setInativ(readOnly);
        this._switchAuth.setInativ(readOnly);
        this._switchJwtAuth.setInativ(readOnly);
        this._inputJwtSecret.setReadOnly(readOnly);
        this._inputJwtIss.setReadOnly(readOnly);
        this._inputJwtAud.setReadOnly(readOnly);
        this._inputJwtRequire.setReadOnly(readOnly);
        this._inputJwtLeeway.setReadOnly(readOnly);
        this._inputHeaderHostName.setReadOnly(readOnly);
        this._inputHeaderHostPort.setReadOnly(readOnly);
        this._switchXForwardedScheme.setInativ(readOnly);
        this._switchXForwardedProto.setInativ(readOnly);
        this._switchXForwardedFor.setInativ(readOnly);
        this._switchXrealip.setInativ(readOnly);
    }
    
    public remove(): void {
        this._element.remove();
    }

}