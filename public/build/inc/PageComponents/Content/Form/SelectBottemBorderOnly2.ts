import {Element} from '../../Element';

/**
 * SelectOption
 */
export type SelectOption = {
  key: string;
  value: string;
};

/**
 * SelectChangeFn
 */
export type SelectChangeFn = (value: any) => void;

/**
 * SelectBottemBorderOnly2
 */
export class SelectBottemBorderOnly2 extends Element {

    protected _selectedValue: string = '';

    public constructor(element: any) {
        super();

        this._element = jQuery('<select class="custom-select form-control-border border-width-2" />').appendTo(element);
    }

    public setValues(options: SelectOption[]): void {
        for (const aoption of options) {
            this.addValue(aoption);
        }
    }

    public addValue(option: SelectOption): void {
        jQuery(`<option value="${option.key}">${option.value}</option>`).appendTo(this._element);
    }

    public setChangeFn(onChangeFn: SelectChangeFn): void {
        this._element.unbind().on('change', (): void => {
            this._selectedValue = this._element.val();
            onChangeFn(this._selectedValue);
        });
    }

    public setSelectedValue(value: string): void {
        this._selectedValue = value;
        this._element.val(value).change();
    }

    public getSelectedValue(): string {
        return this._selectedValue;
    }

}