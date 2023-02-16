import {View, Map} from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import {OSM} from 'ol/source';
import VectorSource from 'ol/source/Vector';
import {Element} from 'bambooo';

/**
 * DashboardMapIp
 */
export class DashboardMapIp extends Element {

    /**
     * map object
     * @protected
     */
    protected _map: Map|null = null;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: any) {
        super();

        const tileLayer = new TileLayer({
            source: new OSM()
        });

        const source = new VectorSource({
            wrapX: false
        });

        const vector = new VectorLayer({
            source
        });

        const telement = this._getAnyElement(elementObject);

        telement.css({
            height: '400px'
        });

        this._map = new Map({
            layers: [tileLayer, vector],
            target: telement[0],
            view: new View({
                center: [0, 0],
                zoom: 4,
                multiWorld: true
            })
        });
    }

}