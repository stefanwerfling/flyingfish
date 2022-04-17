import {Element} from '../../Element';

/**
 * CaretType
 */
export enum CaretType {
    up = 'fa-caret-up',
    left = 'fa-caret-left',
    down = 'fa-caret-down'
}

/**
 * Caret
 */
export class Caret extends Element {

    /**
     * constructor
     * @param element
     * @param type
     */
    public constructor(element: any, type: CaretType = CaretType.up) {
        super();

        let dp = '';

        switch (type) {
            case CaretType.down:
                dp = 'text-danger';
                break;

            case CaretType.left:
                dp = 'text-warning';
                break;

            case CaretType.up:
                dp = 'text-success';
                break;
        }

        this._element = jQuery(`<span class="description-percentage ${dp}"><i class="fas ${type}"></i> </span>`).appendTo(element);
    }

    /**
     * addValue
     * @param value
     */
    public addValue(value: any): void {
        this._element.append(value);
    }

}