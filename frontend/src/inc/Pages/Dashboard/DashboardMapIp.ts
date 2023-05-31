import {View, Map, Feature} from 'ol';
import {Point} from 'ol/geom';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import {fromLonLat} from 'ol/proj';
import {OSM} from 'ol/source';
import VectorSource from 'ol/source/Vector';
import {unByKey} from 'ol/Observable.js';
import {getVectorContext} from 'ol/render.js';
import {easeOut} from 'ol/easing.js';
import {Element} from 'bambooo';
import {Circle as CircleStyle, Stroke, Style} from 'ol/style';

/**
 * DashboardMapIpMark
 */
export type DashboardMapIpMark = {
    latitude: string;
    longitude: string;
};

/**
 * DashboardMapIp
 */
export class DashboardMapIp extends Element {

    /**
     * map object
     * @protected
     */
    protected _map: Map;

    /**
     * map source
     * @protected
     */
    protected _source: VectorSource;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: any) {
        super();

        const tileLayer = new TileLayer({
            source: new OSM()
        });

        this._source = new VectorSource({
            wrapX: false
        });

        const vector = new VectorLayer({
            source: this._source
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
                zoom: 1,
                multiWorld: true
            })
        });

        const duration = 3000;
        const map = this._map;

        this._source.on('addfeature', (e) => {
            const feature = e.feature;
            const start = Date.now();
            const flashGeom = feature.getGeometry().clone();
            const listenerKey = tileLayer.on('postrender', (event) => {
                const frameState = event.frameState;
                const elapsed = frameState.time - start;
                if (elapsed >= duration) {
                    unByKey(listenerKey);
                    return;
                }
                const vectorContext = getVectorContext(event);
                const elapsedRatio = elapsed / duration;
                // radius will be 5 at start and 30 at end.
                // eslint-disable-next-line no-mixed-operators
                const radius = easeOut(elapsedRatio) * 25 + 5;
                const opacity = easeOut(1 - elapsedRatio);

                const style = new Style({
                    image: new CircleStyle({
                        radius,
                        stroke: new Stroke({
                            color: `rgba(242, 38, 19, ${opacity})`,
                            width: 0.25 + opacity
                        })
                    })
                });

                vectorContext.setStyle(style);
                vectorContext.drawGeometry(flashGeom);
                // tell OpenLayers to continue postrender animation
                map.render();
            });
        });
    }

    /**
     * setMarks
     * @param list
     */
    public setMarks(list: DashboardMapIpMark[]): void {
        this._source.clear();

        for (const data of list) {
            const geom = new Point(fromLonLat([parseFloat(data.longitude), parseFloat(data.latitude)]));
            const feature = new Feature(geom);
            this._source.addFeature(feature);
        }
    }

}