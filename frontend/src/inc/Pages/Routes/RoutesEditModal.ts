import {ListenData} from '../../Api/Listen';
import {FormGroup} from '../../Bambooo/Content/Form/FormGroup';
import {FormRow} from '../../Bambooo/Content/Form/FormRow';
import {InputBottemBorderOnly2, InputType} from '../../Bambooo/Content/Form/InputBottemBorderOnly2';
import {SelectBottemBorderOnly2} from '../../Bambooo/Content/Form/SelectBottemBorderOnly2';
import {NavTab} from '../../Bambooo/Content/Tab/NavTab';
import {Element} from '../../Bambooo/Element';
import {ModalDialog, ModalDialogType} from '../../Bambooo/Modal/ModalDialog';

/**
 * HostEditModalDesType
 */
enum HostEditModalDesType {
    ip = '1',
    ssh = '2',
    location = '3'
}

/**
 * HostEditModal
 */
export class RoutesEditModal extends ModalDialog {

    /**
     * Domainname or IP
     * @protected
     */
    protected _inputDomainName: InputBottemBorderOnly2;

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
     * group destination
     * @protected
     */
    protected _groupDestination: FormGroup;

    /**
     * destination ip
     * @protected
     */
    protected _inputDesUp: InputBottemBorderOnly2;

    /**
     * destination port
     * @protected
     */
    protected _inputDesPort: InputBottemBorderOnly2;

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
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'routemodaldialog', ModalDialogType.large);

        const navTab = new NavTab(this._body, 'domainnavtab');
        const tabDetails = navTab.addTab('Details', 'details');

        const tabSsl = navTab.addTab('SSL', 'ssl');
        tabSsl.tab.hide();

        const tabSsh = navTab.addTab('SSH', 'ssh');
        tabSsh.tab.hide();

        const tabLocations = navTab.addTab('Locations', 'locations');
        tabLocations.tab.hide();

        const tabAdvanced = navTab.addTab('Advanced', 'advanced');
        tabAdvanced.tab.hide();

        // tab details -------------------------------------------------------------------------------------------------
        const bodyCard = jQuery('<div class="card-body"/>').appendTo(tabDetails.body);

        const groupDomainName = new FormGroup(bodyCard, 'Domain Name/IP');
        this._inputDomainName = new InputBottemBorderOnly2(groupDomainName.getElement());
        this._inputDomainName.setPlaceholder('mydomain.org');

        const groupListen = new FormGroup(bodyCard, 'Listen');
        this._selectListen = new SelectBottemBorderOnly2(groupListen.getElement());
        this._selectListen.setChangeFn((value) => {
            for (const listen of this._listens) {
                if (value === `${listen.id}`) {
                    tabSsl.tab.hide();

                    switch (listen.type) {
                        case 0:
                            // stream
                            tabAdvanced.tab.show();
                            break;

                        case 1:
                            // http
                            tabSsl.tab.show();
                            tabAdvanced.tab.show();
                            break;
                    }

                    this._setDestinationTypes(listen.type);
                }
            }
        });

        const groupIndex = new FormGroup(bodyCard, 'Index');
        this._inputIndex = new InputBottemBorderOnly2(groupIndex.getElement(), undefined, InputType.number);
        this._inputIndex.setPlaceholder('auto sorting');

        const groupAlias = new FormGroup(bodyCard, 'Alias-Name (Intern)');
        this._inputAliasName = new InputBottemBorderOnly2(groupAlias.getElement());
        this._inputAliasName.setPlaceholder('auto name');

        const groupDesType = new FormGroup(bodyCard, 'Destination-Type');
        this._selectDestinationType = new SelectBottemBorderOnly2(groupDesType.getElement());
        this._selectDestinationType.setChangeFn((value) => {
            tabSsh.tab.hide();
            this._groupDestination.getElement().hide();
            tabLocations.tab.hide();

            switch (value) {
                case HostEditModalDesType.ip:
                    this._groupDestination.getElement().show();
                    break;

                case HostEditModalDesType.ssh:
                    tabSsh.tab.show();
                    break;

                case HostEditModalDesType.location:
                    tabLocations.tab.show();
                    break;
            }
        });

        this._groupDestination = new FormGroup(bodyCard, 'Destination');
        this._groupDestination.getElement().hide();
        const rowDestination = new FormRow(this._groupDestination.getElement());

        const groupDesIp = new FormGroup(rowDestination.createCol(8), 'IP/Host');
        this._inputDesUp = new InputBottemBorderOnly2(groupDesIp.getElement());
        this._inputDesUp.setPlaceholder('192.168.0.100');

        const groupDesPort = new FormGroup(rowDestination.createCol(2), 'Port');
        this._inputDesPort = new InputBottemBorderOnly2(groupDesPort.getElement(), undefined, InputType.number);
        this._inputDesPort.setPlaceholder('80');

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

        this._groupSshUsername = new FormGroup(bodyCardSsh, 'Username');
        this._inputSshUsername = new InputBottemBorderOnly2(this._groupSshUsername.getElement());
        this._groupSshUsername.getElement().hide();

        this._groupSshPaasword = new FormGroup(bodyCardSsh, 'Password');
        this._inputSshPassword = new InputBottemBorderOnly2(this._groupSshPaasword.getElement(), undefined, InputType.password);
        this._groupSshPaasword.getElement().hide();

        this._groupSshListen = new FormGroup(bodyCardSsh, 'Listen');
        this._selectSshListen = new SelectBottemBorderOnly2(this._groupSshListen.getElement());
        this._groupSshListen.getElement().hide();


    }

    /**
     * setDomainName
     * @param name
     */
    public setDomainName(name: string): void {
        this._inputDomainName.setValue(name);
    }

    /**
     * getDomainName
     */
    public getDomainName(): string {
        return this._inputDomainName.getValue();
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

            this._selectListen.addValue({
                key: `${alisten.id}`,
                value: `${alisten.name} - ${alisten.port} (${type})`,
                style: alisten.type === 0 ? 'background:#ffc107;' : 'background:#28a745;'
            });
        }
    }

    /**
     * _setDestinationTypes
     * @param listenType
     * @protected
     */
    protected _setDestinationTypes(listenType: number): void {
        this._selectDestinationType.clearValues();
        this._selectDestinationType.addValue({
            key: '0',
            value: 'Please select a destination type'
        });

        switch (listenType) {
            case 0:
                // stream
                this._selectDestinationType.addValue({
                    key: HostEditModalDesType.ip,
                    value: 'IP/Host direct (Stream)',
                    style: 'background:#ffc107;'
                });

                this._selectDestinationType.addValue({
                    key: HostEditModalDesType.ssh,
                    value: 'Intern ssh server (Stream)',
                    style: 'background:#007bff;'
                });
                break;

            case 1:
                // http

                this._selectDestinationType.addValue({
                    key: HostEditModalDesType.location,
                    value: 'Location/Proxy (Http/Https)',
                    style: 'background:#28a745;'
                });

                this._selectDestinationType.addValue({
                    key: HostEditModalDesType.ssh,
                    value: 'Intern ssh server (HTTP Port listen)',
                    style: 'background:#007bff;'
                });
                break;
        }
    }

}