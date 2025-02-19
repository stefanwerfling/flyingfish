import {CardBodyType, CardLine, CardType, CollectionCardWidget, CollectionWidgetOnUpdate} from 'bambooo';
import {Location} from 'flyingfish_schemas';
import {Credential as CredentialApi} from '../../../Api/Credential.js';
import {NginxLocationDestinationTypes} from '../../../Api/Route.js';
import {LocationWidget} from './LocationWidget.js';

/**
 * Event on PreSet
 */
export type LocationListWidgetOnPreSet = (entry: LocationWidget) => void;

export class LocationListWidget extends CollectionCardWidget<LocationWidget> {

    /**
     * Constructor
     * @param {Element|any} element
     * @param onUpdate
     * @param {boolean} editable
     */
    public constructor(element: Element|any, onUpdate?: CollectionWidgetOnUpdate<LocationWidget>, editable: boolean = false) {
        super({
            element: element,
            editable: editable,
            entryClass: LocationWidget,
            bodyType: CardBodyType.none,
            cardType: CardType.none,
            cardLine: CardLine.none,
            onUpdate: onUpdate
        });

        this._element.setTitle('Location list');
    }

    /**
     * Create a new object
     * @protected
     */
    protected override _createObject(): LocationWidget {
        const location = new LocationWidget(this, this._editable);
        location.setLocation({
            id: 0,
            destination_type: NginxLocationDestinationTypes.none,
            ssh: {},
            match: '',
            proxy_pass: '',
            auth_enable: false,
            credentials: [],
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

        return location;
    }

    /**
     * Set a location list to a collection
     * @param {Location[]} locations
     * @param {LocationListWidgetOnPreSet|null} onPreset
     */
    public async setLocationList(locations: Location[], onPreset: LocationListWidgetOnPreSet|null = null): Promise<void> {
        this.removeAll();

        const credentials = await CredentialApi.getList();

        for (const tlocation of locations) {
            const location = new LocationWidget(this, this._editable);

            if (credentials.list) {
                location.setCredentialValues(credentials.list);
            }

            if (onPreset !== null) {
                onPreset(location);
            }

            location.setLocation(tlocation);
            this.addObject(location);
        }
    }

    /**
     * Return a location list
     * @returns {Location[]}
     */
    public getLocationList(): Location[] {
        const list: Location[] = [];

        for (const location of this._objects) {
            list.push(location.getLocation());
        }

        return list;
    }

    /**
     * Remove a location widget
     * @param {LocationWidget} location
     */
    public removeLocation(location: LocationWidget): void {
        this.removeObject(location);
    }

}