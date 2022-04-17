import {Element} from '../../Element';

export enum SmallBoxBg {
    info = 'bg-info',
    success = 'bg-success',
    warrning = 'bg-warning',
    danger = 'bg-danger'
}

export class SmallBox extends Element {

    private _bg: SmallBoxBg | null = null;
    private _innerElement: any;
    private _iconElement: any;
    private _footerElement: any;
    private _h3Element: any;
    private _pElement: any;

    public constructor(elementObject: Element, bg?: SmallBoxBg) {
        super();

        this._element = jQuery('<div class="small-box" />').appendTo(elementObject.getElement());

        if (bg) {
            this.setBoxBg(bg);
        } else {
            this.setBoxBg(SmallBoxBg.info);
        }

        this._innerElement = jQuery('<div class="inner" />').appendTo(this._element);
        this._h3Element = jQuery('<h3 />').appendTo(this._innerElement);
        this._pElement = jQuery('<p />').appendTo(this._innerElement);
        this._iconElement = jQuery('<div class="icon" />').appendTo(this._element);
        this._footerElement = jQuery('<a href="#" class="small-box-footer"/>').appendTo(this._element);
    }

    public setBoxBg(bg: SmallBoxBg): void {
        this._bg = bg;
        this._element.removeClass().addClass(`small-box ${bg}`);
    }

    public getBoxBg(): SmallBoxBg {
        return this._bg!;
    }

    public setH3Text(text: string): void {
        this._h3Element.empty().append(text);
    }

    public setH3Sup(text: string): void {
        jQuery(`<sup style="font-size: 20px">${text}</sup>`).appendTo(this._h3Element);
    }

    public setText(text: string): void {
        this._pElement.empty().append(text);
    }

    public setFootTextLink(text: string): void {
        this._footerElement.empty().append(`${text} <i class="fas fa-arrow-circle-right"></i>`);
    }

    public setIcon(iconClass: string): void {
        this._iconElement.empty().append(jQuery(`<i class="ion ${iconClass}" />`));
    }

}