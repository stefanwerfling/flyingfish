import {View, Map, Feature, Overlay} from 'ol';
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
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import {Vts} from 'vts';

/**
 * DashboardMapIpMark
 */
export type DashboardMapIpMark = {
    latitude: string;
    longitude: string;
    id: number;
    content: string;
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
     * tooltip popup
     * @protected
     */
    protected _tooltip_popup: any;

    /**
     * map source
     * @protected
     */
    protected _source: VectorSource;

    protected _popover: any|undefined;

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: any) {
        super();

        const telement = this._getAnyElement(elementObject);

        telement.css({
            height: '400px'
        });

        this._tooltip_popup = jQuery('<div id="popup"></div>').appendTo(telement);

        const tileLayer = new TileLayer({
            source: new OSM({
                wrapX: false
            })
        });

        this._source = new VectorSource({
            wrapX: false
        });

        const vector = new VectorLayer({
            source: this._source
        });

        this._map = new Map({
            layers: [tileLayer, vector],
            target: telement[0],
            view: new View({
                center: fromLonLat([11.030, 47.739]),
                zoom: 2.2,
                multiWorld: true
            })
        });

        // tooltip -----------------------------------------------------------------------------------------------------

        const overlayTooltip = new Overlay({
            element: this._tooltip_popup[0],
            offset: [10, 0],
            positioning: 'bottom-left'
        });

        this._map.addOverlay(overlayTooltip);

        this._map.on('click', (evt) => {
            const feature = this._map.forEachFeatureAtPixel(evt.pixel, (inFeature) => {
                return inFeature;
            });

            this.disposePopover();

            if (!feature) {
                return;
            }

            overlayTooltip.setPosition(evt.coordinate);
            this._popover = this._tooltip_popup.popover({
                html: true,
                content: () => {
                    return feature.get('content');
                }
            });

            this._popover.popover('show');
        });

        this._map.on('pointermove', (evt) => {
            const pixel = this._map.getEventPixel(evt.originalEvent);
            const hit = this._map.hasFeatureAtPixel(pixel);
            const target = this._map.getTarget();

            if (target) {
                // @ts-ignore
                if ('style' in target) {
                    target.style.cursor = hit ? 'pointer' : '';
                }
            }
        });

        this._map.on('movestart', () => {
            this.disposePopover();
        });

        // -------------------------------------------------------------------------------------------------------------

        const duration = 3000;
        const map = this._map;

        this._source.on('addfeature', (e) => {
            if (Vts.isUndefined(e.feature)) {
                return;
            }

            const feature = e.feature;
            const start = Date.now();
            const geometry = feature.getGeometry();

            if (Vts.isUndefined(geometry)) {
                return;
            }

            const flashGeom = geometry.clone();
            const listenerKey = tileLayer.on('postrender', (event) => {
                const frameState = event.frameState;

                if (Vts.isUndefined(frameState)) {
                    return;
                }

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

            feature.set('content', data.content);
            feature.setStyle(new Style({
                image: new CircleStyle({
                    radius: 5,
                    stroke: new Stroke({
                        color: '#ffffff',
                        width: 1
                    }),
                    fill: new Fill({
                        color: 'red'
                    })
                })
            }));

            this._source.addFeature(feature);
        }
    }

    public async unloadContent(): Promise<void> {
        this.disposePopover(true);
        jQuery('.popover').remove();

        if (this._tooltip_popup) {
            this._tooltip_popup.remove();
        }
    }

    public disposePopover(andRemove: boolean = false): void {
        if (this._popover) {
            this._popover.popover('dispose');

            if (andRemove) {
                this._popover.remove();
            }

            this._popover = undefined;
        }
    }

}