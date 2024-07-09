import {CardBodyType, CardLine, CardType, CollectionCardWidget} from 'bambooo';
import {CollectionWidgetOnUpdate} from 'bambooo/src/v1/Widget/Collection/CollectionWidget';
import {Location} from 'flyingfish_schemas/dist/src';
import {NginxLocationDestinationTypes} from '../../../Api/Route';
import {LocationWidget} from './LocationWidget';

export class LocationListWidget extends CollectionCardWidget<LocationWidget> {

    /**
     * Constructor
     * @param {Element|any} element
     * @param {boolean} editable
     */
    public constructor(element: Element|any, onUpdate?: CollectionWidgetOnUpdate<LocationWidget>, editable: boolean = false) {
        super({
            element,
            editable,
            entryClass: LocationWidget,
            bodyType: CardBodyType.none,
            cardType: CardType.none,
            cardLine: CardLine.none,
            onUpdate
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
     * Set a location list to collection
     * @param {Location[]} locations
     */
    public setLocationList(locations: Location[]): void {
        this.removeAll();

        for (const tlocation of locations) {
            const location = new LocationWidget(this, this._editable);
            location.setLocation(tlocation);

            this.addObject(location);
        }
    }

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