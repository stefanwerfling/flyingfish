import {ListenData} from '../../Api/Listen';
import {Location} from '../../Api/Route';
import {SshPortEntry} from '../../Api/Ssh';
import {SslProvider} from '../../Api/Ssl';
import {ButtonClass, ButtonDefault, ButtonDefaultType} from '../../Bambooo/Content/Button/ButtonDefault';
import {Card, CardBodyType, CardType} from '../../Bambooo/Content/Card/Card';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {FormRow} from '../../Bambooo/Content/Form/FormRow';
import {InputBottemBorderOnly2, InputType} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {SelectBottemBorderOnly2} from '../../Bambooo/Content/Form/SelectBottemBorderOnly2';
import {Switch} from '../../Bambooo/Content/Form/Switch';
import {NavTab} from '../../Bambooo/Content/Tab/NavTab';
import {Element} from '../../Bambooo/Element';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * RouteHttpEditLocationModalDesType
 */
export enum RouteHttpEditLocationModalDesType {
    none = '0',
    proxypass = '1',
    redirect = '2',
    ssh = '3'
}

/**
 * RouteHttpEditModalButtonClickFn
 */
export type RouteHttpEditModalButtonClickFn = () => void;

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
     * location
     * @protected
     */
    protected _location: Location;

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
     * constructor
     * @param card
     * @param location
     */
    public constructor(card: Card, location: Location) {
        this._location = location;

        this._card = new Card(card.getElement(), CardBodyType.none, CardType.success);
        this._card.setTitle(`#${location.id}`);

        const groupMatch = new FormGroup(this._card, 'Match');
        this._inputMatch = new InputBottemBorderOnly2(groupMatch);
        this._inputMatch.setPlaceholder('/');

        const groupDesType = new FormGroup(this._card, 'Destination-Type');
        this._selectDestinationType = new SelectBottemBorderOnly2(groupDesType);

        this._selectDestinationType.addValue({
            key: '0',
            value: 'Please select a destination type'
        });

        this._selectDestinationType.addValue({
            key: RouteHttpEditLocationModalDesType.proxypass,
            value: 'Proxy Pass'
        });

        this._selectDestinationType.addValue({
            key: RouteHttpEditLocationModalDesType.redirect,
            value: 'Redirect'
        });

        this._selectDestinationType.addValue({
            key: RouteHttpEditLocationModalDesType.ssh,
            value: 'Ssh'
        });

        // proxy pass --------------------------------------------------------------------------------------------------

        const groupProxyPass = new FormGroup(this._card, 'Proxy Pass');
        this._inputProxyPass = new InputBottemBorderOnly2(groupProxyPass);
        this._inputProxyPass.setPlaceholder('http://<ip>/');
        groupProxyPass.hide();

        // redirect ----------------------------------------------------------------------------------------------------

        const rowRed = new FormRow(this._card);
        rowRed.hide();

        const groupRedCode = new FormGroup(rowRed.createCol(4), 'Redirect-Code');
        this._inputRedirectCode = new InputBottemBorderOnly2(groupRedCode, undefined, InputType.number);
        this._inputRedirectCode.setValue('301');

        const groupRedPath = new FormGroup(rowRed.createCol(8), 'Redirect-Path');
        this._inputRedirectPath = new InputBottemBorderOnly2(groupRedPath, undefined);
        this._inputRedirectPath.setPlaceholder('https://<domain>/path');

        // ssh ---------------------------------------------------------------------------------------------------------

        const rowSsh = new FormRow(this._card);
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
            groupProxyPass.hide();
            rowRed.hide();
            rowSsh.hide();

            switch (value) {
                case RouteHttpEditLocationModalDesType.proxypass:
                    groupProxyPass.show();
                    break;

                case RouteHttpEditLocationModalDesType.redirect:
                    rowRed.show();
                    break;

                case RouteHttpEditLocationModalDesType.ssh:
                    rowSsh.show();
                    break;
            }
        });

        // buttons -----------------------------------------------------------------------------------------------------

        const removeUpstreamBtn = new ButtonDefault(
            this._card.getToolsElement(),
            '',
            'fa-trash',
            ButtonClass.tool,
            ButtonDefaultType.none
        );

        removeUpstreamBtn.setOnClickFn(() => {
            // todo mark as delete
            this.remove();
        });

        // set values --------------------------------------------------------------------------------------------------
        this.setMatch(location.match);

        if (location.proxy_pass != '') {
            this.setDestinationType(RouteHttpEditLocationModalDesType.proxypass);
            this.setProxyPass(location.proxy_pass);
        } else if (location.ssh && location.ssh.port_out) {
            this.setDestinationType(RouteHttpEditLocationModalDesType.ssh);
            this.setSshSchema(`${location.ssh.schema}`);
            this.setSshListen(`${location.ssh.port_out}`);
        } else if (location.redirect && (location.redirect.redirect !== '')) {
            this.setDestinationType(RouteHttpEditLocationModalDesType.redirect);
            this.setRedirectCode(location.redirect.code);
            this.setRedirectPath(location.redirect.redirect);
        } else {
            this.setDestinationType(RouteHttpEditLocationModalDesType.none);
        }
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
    public setDestinationType(type: RouteHttpEditLocationModalDesType): void {
        this._selectDestinationType.setSelectedValue(`${type}`);
    }

    /**
     * getDestinationType
     */
    public getDestinationType(): string {
        return this._selectDestinationType.getSelectedValue();
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
        for (const entry of listens) {
            this._selectSshListen.addValue({
                key: `${entry.id}`,
                value: `SSH INTERNT OUT (<-- ${entry.port})`
            })
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
        return parseInt(this._selectSshListen.getSelectedValue(), 10) || 0;
    }

    /**
     * getLocation
     */
    public getLocation(): Location {
        const tlocation: Location = {
            id: this._location.id,
            match: this.getMatch(),
            proxy_pass: ''
        };

        switch (this.getDestinationType()) {
            case RouteHttpEditLocationModalDesType.proxypass:
                tlocation.proxy_pass = this.getProxyPass();
                break;

            case RouteHttpEditLocationModalDesType.redirect:
                tlocation.redirect = {
                    code: this.getRedirectCode(),
                    redirect: this.getRedirectPath()
                };
                break;

            case RouteHttpEditLocationModalDesType.ssh:
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
     * ssl email
     * @protected
     */
    protected _inputSslEmail: InputBottemBorderOnly2;

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
            const location = new LocationCard(this._locationCard, {
                id: 0,
                ssh: {},
                match: '',
                proxy_pass: ''
            });

            location.setSshListens(this._sshListens);

            this._locationCards.push(location);
        });

        const tabAdvanced = this._navTab.addTab('Advanced', 'routehttpadvanced');
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

        // tab ssl -----------------------------------------------------------------------------------------------------

        const bodyCardSsl = jQuery('<div class="card-body"/>').appendTo(tabSsl.body);

        const groupSslEnable = new FormGroup(bodyCardSsl, 'SSL Enable');
        this._switchSslEnable = new Switch(groupSslEnable.getElement(), 'ssl_enable');

        const groupSslProvider = new FormGroup(bodyCardSsl, 'SSL Provider');
        this._selectSslProvider = new SelectBottemBorderOnly2(groupSslProvider);
        groupSslProvider.hide();

        const groupSslEmail = new FormGroup(bodyCardSsl, 'SSL EMail');
        this._inputSslEmail = new InputBottemBorderOnly2(groupSslEmail);
        this._inputSslEmail.setPlaceholder('admin@flyingfish.org');
        groupSslEmail.hide();

        this._switchSslEnable.setChangeFn((value) => {
            groupSslProvider.hide();
            groupSslEmail.hide();

            if (value) {
                groupSslProvider.show();
                groupSslEmail.show();
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

            const type = alisten.type === 0 ? 'Stream' : 'HTTP';

            const option = {
                key: `${alisten.id}`,
                value: `${alisten.name} - ${alisten.port} (${type})`,
                style: alisten.type === 0 ? 'background:#ffc107;' : 'background:#28a745;'
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
            const location = new LocationCard(this._locationCard, tlocation);
            location.setSshListens(this._sshListens);

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

        for (const provider of providers) {
            this._selectSslProvider.addValue({
                key: provider.name,
                value: provider.title
            })
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
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setDomainName('');
        this._inputIndex.setValue('');
        this.setListen('0');
        this.setSslEnable(false);

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