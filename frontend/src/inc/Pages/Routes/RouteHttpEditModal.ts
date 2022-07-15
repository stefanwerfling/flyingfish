import {ListenData} from '../../Api/Listen';
import {Location} from '../../Api/Route';
import {ButtonClass, ButtonDefault, ButtonDefaultType} from '../../Bambooo/Content/Button/ButtonDefault';
import {Card, CardBodyType, CardType} from '../../Bambooo/Content/Card/Card';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {FormRow} from '../../Bambooo/Content/Form/FormRow';
import {InputBottemBorderOnly2, InputType} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {SelectBottemBorderOnly2} from '../../Bambooo/Content/Form/SelectBottemBorderOnly2';
import {NavTab} from '../../Bambooo/Content/Tab/NavTab';
import {Element} from '../../Bambooo/Element';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * RouteHttpEditModalDesType
 */
export enum RouteHttpEditModalDesType {
    location = '1',
    ssh = '2'
}

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
        this._inputProxyPass.setPlaceholder('http://192.168.178.1/');
        groupProxyPass.hide();

        // redirect ----------------------------------------------------------------------------------------------------

        const rowRed = new FormRow(this._card);
        rowRed.hide();

        const groupRedCode = new FormGroup(rowRed.createCol(4), 'Redirect-Code');
        this._inputRedirectCode = new InputBottemBorderOnly2(groupRedCode, undefined, InputType.number);
        this._inputRedirectCode.setValue('301');

        const groupRedPath = new FormGroup(rowRed.createCol(8), 'Redirect-Path');
        this._inputRedirectCode = new InputBottemBorderOnly2(groupRedPath, undefined);
        this._inputRedirectCode.setPlaceholder('https://<domain>/path');

        // ssh ---------------------------------------------------------------------------------------------------------

        const rowSsh = new FormRow(this._card);
        rowSsh.hide();

        const groupSshSchema = new FormGroup(rowSsh.createCol(4), 'Schema');
        this._selectSshSchema = new SelectBottemBorderOnly2(groupSshSchema);

        this._selectSshSchema.addValue({
            key: 'http',
            value: 'Http'
        });

        this._selectSshSchema.addValue({
            key: 'https',
            value: 'Https'
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
     * setDestinationType
     * @param type
     */
    public setDestinationType(type: RouteHttpEditLocationModalDesType): void {
        this._selectDestinationType.setSelectedValue(`${type}`);
    }

    /**
     * setProxyPass
     * @param proxypass
     */
    public setProxyPass(proxypass: string): void {
        this._inputProxyPass.setValue(proxypass);
    }

    /**
     * setSshSchema
     * @param schema
     */
    public setSshSchema(schema: string): void {
        this._selectSshSchema.setSelectedValue(schema);
    }

    /**
     * setSshListen
     * @param listen
     */
    public setSshListen(listen: string): void {
        this._selectSshListen.setSelectedValue(listen);
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
     * Alias name
     * @protected
     */
    protected _inputAliasName: InputBottemBorderOnly2;


    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'routehttpmodaldialog', ModalDialogType.large);

        this._navTab = new NavTab(this._body, 'routehttpnavtab');
        const tabDetails = this._navTab.addTab('Details', 'routehttpdetails');

        const tabLocation = this._navTab.addTab('Location', 'routehttplocation');

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
            this._locationCards.push(new LocationCard(this._locationCard, {
                id: 0,
                ssh: {},
                match: '',
                proxy_pass: ''
            }));
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

        const groupAlias = new FormGroup(bodyCard, 'Alias-Name (Intern)');
        this._inputAliasName = new InputBottemBorderOnly2(groupAlias);
        this._inputAliasName.setPlaceholder('auto name');
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
     * setLocations
     * @param locations
     */
    public setLocations(locations: Location[]): void {
        for (const tlocation of locations) {
            this._locationCards.push(new LocationCard(this._locationCard, tlocation));
        }
    }

    /**
     * resetValues
     */
    public resetValues(): void {
        this.setId(null);
        this.setDomainName('');
        this._inputIndex.setValue('');
        this.setListen('0');

        this._locationCards.forEach((element, index) => {
            element.remove();
            delete this._locationCards[index];
        });
    }
}