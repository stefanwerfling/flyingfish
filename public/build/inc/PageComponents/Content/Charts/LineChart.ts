import {Element} from '../../Element';

/**
 * LineChart
 */
export class LineChart extends Element {

    protected _height: string = '250';

    /**
     * constructor
     * @param element
     */
    public constructor(element: any) {
        super();

        this._element = jQuery('<canvas style="max-width: 100%;" />').appendTo(element);
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
            'max-height': `${this._height}px`
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