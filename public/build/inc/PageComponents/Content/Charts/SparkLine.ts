import {Element} from '../../Element';

/**
 * SparkLine
 */
export class SparkLine extends Element {

    protected _height: string = '70';
    protected _width: string = '240';

    protected _data: number[] = [];

    /**
     * constructor
     * @param element
     */
    public constructor(element: any) {
        super();

        this._element = jQuery('<div />').appendTo(element);
    }

    public addData(value: number): void {
        this._data.push(value);
    }

    /**
     * print
     */
    public print(): void {
        // @ts-ignore
        // eslint-disable-next-line no-undef
        const spark = new Sparkline(this._element[0], {
            width: this._width,
            height: this._height,
            lineColor: '#92c1dc',
            endColor: '#92c1dc'
        });

        spark.draw(this._data);
    }

}