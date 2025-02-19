import {Element} from 'bambooo';

// have create an issue: https://github.com/themustafaomar/jsvectormap/issues/176
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import JsVectorMap from 'jsvectormap';
// @ts-ignore
import 'jsvectormap/dist/maps/world.js';
import 'jsvectormap/src/scss/jsvectormap.scss';

export class IpAccessCountriesWidget extends Element {

    protected _map: JsVectorMap;

    private _selectedCountries: Set<string> = new Set<string>();

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: any) {
        super();

        const telement = this._getAnyElement(elementObject);

        this._element = jQuery('<div style="width: 100%; height: 500px"></div>').appendTo(telement);

        this._map = new JsVectorMap({
            selector: jQuery(this._element)[0],
            map: 'world',
            regionsSelectable: true,
            zoomMin: 0.9,
            focusOn: {
                x: 0.5,
                y: 0.5,
                scale: 0.9
            },
            onRegionClick: (_: any, code: string): void => {
                this._toggleCountry(code);
            }
        });

        this._element.on('resize', () => {
            this._map.updateSize();
        });
    }

    protected _toggleCountry(code: string): void {
        if (this._selectedCountries.has(code)) {
            this._selectedCountries.delete(code);
            this._map.setSelectedRegions(Array.from(this._selectedCountries));
        } else {
            this._selectedCountries.add(code);
            this._map.setSelectedRegions(Array.from(this._selectedCountries));
        }

        console.log(this._selectedCountries);
    }

    public getSelectedCountries(): string[] {
        return Array.from(this._selectedCountries);
    }

    public update(): void {
        this._map.updateSize();
    }

}