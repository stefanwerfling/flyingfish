import {Element} from '../../Element';

/**
 * ButtonDefaultType
 */
export enum ButtonDefaultType {
    none = '',
    small = 'btn-sm'
}

/**
 * ButtonClass
 */
export enum ButtonClass {
    default = 'btn-default',
    info = 'btn-info',
    danger = 'btn-danger',
    warning = 'btn-warning',
    success = 'btn-success'
}

type ButtonDefaultClickFn = () => void;

/**
 * ButtonDefault
 */
export class ButtonDefault extends Element {

    /**
     * class
     * @protected
     */
    protected _class = ButtonClass.default;

    /**
     * title
     * @protected
     */
    protected _title = '';

    /**
     * icon
     * @protected
     */
    protected _icon = '';

    /**
     * click enable
     * @protected
     */
    protected _clickEnable = true;

    /**
     * constructor
     * @param element
     * @param title
     * @param icon
     * @param bnClass
     * @param bnType
     */
    public constructor(
        element: any,
        title?: string,
        icon?: string,
        bnClass: ButtonClass = ButtonClass.default,
        bnType: ButtonDefaultType = ButtonDefaultType.small
    ) {
        super();

        this._class = bnClass;
        this._element = jQuery(`<button type="button" class="btn ${bnClass} ${bnType}" />`).appendTo(element);

        this.setValue(title, icon);
    }

    /**
     * setValue
     * @param title
     * @param icon
     */
    public setValue(title?: string, icon?: string): void {
        if (title) {
            this._title = title;
        }

        if (icon) {
            this._icon = icon;
        }

        this._element.empty();

        if (this._icon !== '') {
            this._element.append(`<i class="fas ${this._icon}" />`);
        }

        if (this._title !== '') {
            if (this._icon !== '') {
                this._element.append(' ');
            }

            this._element.append(this._title);
        }
    }

    /**
     * setOnClickFn
     * @param onClick
     */
    public setOnClickFn(onClick: ButtonDefaultClickFn): void {
        this._element.unbind().on('click', (): void => {
            if (this._clickEnable) {
                onClick();
            }
        });
    }

    /**
     * setClass
     * @param bnClass
     */
    public setClass(bnClass: ButtonClass = ButtonClass.default): void {
        this._element.removeClass(this._class).addClass(bnClass);
        this._class = bnClass;
    }

    /**
     * setClickEnable
     * @param enable
     */
    public setClickEnable(enable: boolean): void {
        this._clickEnable = enable;
    }

}