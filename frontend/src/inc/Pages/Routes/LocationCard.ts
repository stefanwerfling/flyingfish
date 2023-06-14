import {Location, SshPortEntry} from 'flyingfish_schemas';
import {NginxLocationDestinationTypes} from '../../Api/Route';
import {ButtonClass, ButtonDefault, ButtonDefaultType, Card, CardBodyType, CardType, FormGroup, FormRow,
    InputBottemBorderOnly2, InputType, SelectBottemBorderOnly2, Switch, NavTab} from 'bambooo';
import {UtilNumber} from '../../Utils/UtilNumber';

/**
 * LocationCard
 */
export class LocationCard {

    /**
     * info card
     * @protected
     */
    protected _card: Card;

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
     * constructor
     * @param card
     * @param index
     */
    public constructor(card: Card, index: number) {
        this._card = new Card(card.getElement(), CardBodyType.none, CardType.success);

        this._navTab = new NavTab(this._card, 'routehttplocationnavtab');
        const tabDetails = this._navTab.addTab('Details', `routehttplocationdetails${index}`);
        const tabAdvanced = this._navTab.addTab('Advanced', `routehttplocationadvanced${index}`);

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
        this._inputRedirectPath = new InputBottemBorderOnly2(groupRedPath, undefined);
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
        this._switchAuth.hide();

        const rowHost = new FormRow(bodyCardAdv);

        const groupEnableHeaderHost = new FormGroup(rowHost.createCol(4), 'Header Host Enable');
        this._switchHeaderHost = new Switch(groupEnableHeaderHost, 'locheaderhost');

        const rowHostOptions = new FormRow(bodyCardAdv);
        const groupHeaderHostName = new FormGroup(rowHostOptions.createCol(6), 'Header Hostname');
        this._inputHeaderHostName = new InputBottemBorderOnly2(groupHeaderHostName);
        this._inputHeaderHostName.setPlaceholder('Bypass a Hostname, empty set by $host');

        const groupHeaderHostPort = new FormGroup(rowHostOptions.createCol(6), 'Header Port');
        this._inputHeaderHostPort = new InputBottemBorderOnly2(groupHeaderHostPort);
        this._inputHeaderHostPort.setPlaceholder('Only use by diff port on router');


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
            this._card.getToolsElement(),
            '',
            'fa-trash',
            ButtonClass.tool,
            ButtonDefaultType.none
        );

        removeUpstreamBtn.setOnClickFn(() => {
            this.remove();
        });
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
     * @param listens
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

    /**
     * setLocation
     * @param location
     */
    public setLocation(location: Location): void {
        this._location = location;

        this._card.setTitle(`#${location.id}`);

        this.setMatch(location.match);
        this.setEnableWebsocket(location.websocket_enable);
        this.setEnableAuth(location.auth_enable);
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
     * getLocation
     */
    public getLocation(): Location {
        const tlocation: Location = {
            id: this._location!.id,
            destination_type: this.getDestinationType(),
            match: this.getMatch(),
            proxy_pass: '',
            auth_enable: this.getEnableAuth(),
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
     * remove
     */
    public remove(): void {
        this._card.getMainElement().remove();
    }

}