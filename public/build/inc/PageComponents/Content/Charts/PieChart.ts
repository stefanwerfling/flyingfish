import {Element} from '../../Element';

/**
 * PieChart
 */
export class PieChart extends Element {

    protected _height: string = '350';
    protected _width: string = '350';

    /**
     * constructor
     * @param element
     */
    public constructor(element: any) {
        super();

        this._element = jQuery('<canvas />').appendTo(element);
        this._changeCanvasSize();
    }

    /**
     * _changeCanvasSize
     * @protected
     */
    protected _changeCanvasSize(): void {
        this._element.css({
            'min-height': `${this._height}px`,
            'height': `${this._height}px`,
            'max-height': `${this._height}px`,
            'min-width': `${this._width}px`,
            'width': `${this._width}px`,
            'max-width': `${this._width}px`
        });
    }

    /**
     * _getContext
     * @protected
     */
    protected _getContext(): any {
        return this._element.get(0).getContext('2d');
    }

}