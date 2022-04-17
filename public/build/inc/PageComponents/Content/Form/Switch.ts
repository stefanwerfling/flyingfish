import {Element} from '../../Element';

type SwitchChangeFn = (value: any) => void;

export class Switch extends Element {

    protected _input: any;
    protected _label: any;

    public constructor(element: any, id: string, label: any = '') {
        super();

        this._element = jQuery('<div class="form-group" />').appendTo(element);

        const control = jQuery('<div class="custom-control custom-switch" />').appendTo(this._element)

        this._input = jQuery(`<input type="checkbox" class="custom-control-input"  id="${id}" />`).appendTo(control);
        this._label = jQuery(`<label class="custom-control-label" for="${id}" />`).appendTo(control);

        this.setLabel(label);
    }

    public setLabel(label: any): void {
        this._label.empty().append(label);
    }

    public setEnable(enable: boolean): void {
        this._input.prop('checked', enable);
    }

    public isEnable(): boolean {
        return this._input.is(':checked');
    }

    public setChangeFn(onChangeFn: SwitchChangeFn): void {
        this._input.unbind().on('change', (): void => {
            onChangeFn(this.isEnable());
        });
    }

}