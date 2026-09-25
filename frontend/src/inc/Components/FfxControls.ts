import {Element} from 'bambooo';

/**
 * FfxControls — small form-control widgets for the Datacenter/tree-shell (`.ffx-*`) pages
 * (see {@link ../../Pages/ClusterView.ts} / NodeCluster.ts). Each widget extends bambooo's
 * `Element` (the same base every other FlyingFish widget derives from, e.g.
 * IpAccessCountriesWidget) and reproduces exactly the inline chrome those pages already use
 * — no visual change, just one place to own it instead of a literal style string repeated
 * at every call site.
 */

/**
 * FfxButtonVariant — the button's color scheme.
 */
export type FfxButtonVariant = 'primary' | 'neutral' | 'danger';

/**
 * FfxButtonSize — the button's padding/font-size, one token per size already in use.
 */
export type FfxButtonSize = 'form' | 'field' | 'list' | 'compact' | 'xs';

const FFX_BUTTON_VARIANT_STYLE: Record<FfxButtonVariant, string> = {
    primary: 'border:0;border-radius:6px;background:#0f8a8a;color:#fff;cursor:pointer;font-weight:600',
    neutral: 'border:0;border-radius:6px;background:rgba(127,127,127,.14);color:var(--soft);cursor:pointer',
    danger: 'border:0;border-radius:6px;background:rgba(192,57,43,.14);color:#c0392b;cursor:pointer'
};

const FFX_BUTTON_SIZE_STYLE: Record<FfxButtonSize, string> = {
    form: 'padding:7px 14px',
    field: 'padding:6px 14px;font-size:12.5px',
    list: 'padding:4px 10px;font-size:12px',
    compact: 'padding:5px 12px;font-size:12px',
    xs: 'padding:3px 8px;font-size:11.5px'
};

/**
 * FfxButton — an action button (create/save/edit/delete/revoke/...).
 */
export class FfxButton extends Element {

    /**
     * @param label - button text
     * @param variant - color scheme
     * @param size - padding/font-size
     */
    public constructor(label: string, variant: FfxButtonVariant, size: FfxButtonSize) {
        super();
        this._element = jQuery('<button type="button"></button>')
            .attr('style', `${FFX_BUTTON_VARIANT_STYLE[variant]};${FFX_BUTTON_SIZE_STYLE[size]}`)
            .text(label);
    }

    /**
     * onClick
     * @param fn - click handler
     * @returns {this}
     */
    public onClick(fn: () => void): this {
        this._element.on('click', fn);

        return this;
    }

    /**
     * setDisabled
     * @param disabled
     */
    public setDisabled(disabled: boolean): void {
        this._element.prop('disabled', disabled);
    }

    /**
     * setLabel
     * @param label
     */
    public setLabel(label: string): void {
        this._element.text(label);
    }

}

/**
 * FfxInputSize — the input's padding/font-size.
 */
export type FfxInputSize = 'form' | 'compact';

const FFX_INPUT_SIZE_STYLE: Record<FfxInputSize, string> = {
    form: 'padding:7px 10px;border-radius:6px;border:1px solid rgba(127,127,127,.35);background:rgba(127,127,127,.08)',
    compact: 'padding:5px 8px;border-radius:6px;border:1px solid rgba(127,127,127,.35);background:rgba(127,127,127,.08);font-size:12px'
};

/**
 * FfxInput — a styled text input.
 */
export class FfxInput extends Element {

    /**
     * @param size - padding/font-size
     * @param placeholder - optional placeholder
     */
    public constructor(size: FfxInputSize, placeholder: string = '') {
        super();
        this._element = jQuery('<input type="text">').attr('style', FFX_INPUT_SIZE_STYLE[size]);

        if (placeholder !== '') {
            this._element.attr('placeholder', placeholder);
        }
    }

    /**
     * getValue (trimmed)
     */
    public getValue(): string {
        return `${this._element.val() ?? ''}`.trim();
    }

    /**
     * setValue
     * @param value
     */
    public setValue(value: string): void {
        this._element.val(value);
    }

    /**
     * setGrow — the flex/min-width a form row gives this input (layout, not chrome).
     * @param flex
     * @param minWidth
     */
    public setGrow(flex: string, minWidth: string): void {
        this._element.css({
            flex,
            'min-width': minWidth
        });
    }

}

/**
 * FfxTextarea — a monospace multi-line input (pasted JSON blobs).
 */
export class FfxTextarea extends Element {

    /**
     * @param rows - visible row count
     * @param placeholder - optional placeholder
     */
    public constructor(rows: number, placeholder: string = '') {
        super();
        this._element = jQuery('<textarea></textarea>')
            .attr('rows', rows)
            .attr('style', 'width:100%;box-sizing:border-box;margin-top:4px;padding:8px 10px;border-radius:6px;border:1px solid rgba(127,127,127,.35);background:rgba(127,127,127,.08);font-family:monospace;font-size:12px');

        if (placeholder !== '') {
            this._element.attr('placeholder', placeholder);
        }
    }

    /**
     * getValue
     */
    public getValue(): string {
        return `${this._element.val() ?? ''}`;
    }

    /**
     * setValue
     * @param value
     */
    public setValue(value: string): void {
        this._element.val(value);
    }

}

/**
 * FfxColorInput — the group-color picker.
 */
export class FfxColorInput extends Element {

    /**
     * constructor
     */
    public constructor() {
        super();
        this._element = jQuery('<input type="color">')
            .attr('style', 'width:38px;height:32px;padding:0;border:0;background:none;cursor:pointer');
    }

    /**
     * getValue
     */
    public getValue(): string {
        return `${this._element.val() ?? ''}`;
    }

    /**
     * setValue
     * @param value
     */
    public setValue(value: string): void {
        this._element.val(value);
    }

}

/**
 * FfxSelectSize — the select's padding/font-size.
 */
export type FfxSelectSize = 'field' | 'compact' | 'list';

const FFX_SELECT_SIZE_STYLE: Record<FfxSelectSize, string> = {
    field: 'padding:6px 8px;border-radius:6px;border:1px solid rgba(127,127,127,.35);background:rgba(127,127,127,.08);font-size:12.5px',
    compact: 'padding:5px 8px;border-radius:6px;border:1px solid rgba(127,127,127,.35);background:rgba(127,127,127,.08);font-size:12px',
    list: 'padding:3px 6px;border-radius:6px;border:1px solid rgba(127,127,127,.35);background:rgba(127,127,127,.08);font-size:12px'
};

/**
 * FfxSelectOption
 */
export type FfxSelectOption = {
    key: string;
    label: string;
};

/**
 * FfxSelect — a styled native dropdown.
 */
export class FfxSelect extends Element {

    protected _onChange: ((value: string) => void) | null = null;

    /**
     * @param size - padding/font-size
     * @param options - the initial choices
     */
    public constructor(size: FfxSelectSize, options: FfxSelectOption[] = []) {
        super();
        this._element = jQuery('<select></select>').attr('style', FFX_SELECT_SIZE_STYLE[size]);
        this.setOptions(options);

        this._element.on('change', () => {
            if (this._onChange !== null) {
                this._onChange(this.getValue());
            }
        });
    }

    /**
     * setOptions — replace the choices.
     * @param options
     */
    public setOptions(options: FfxSelectOption[]): void {
        this._element.empty();

        for (const opt of options) {
            jQuery('<option></option>').attr('value', opt.key).text(opt.label).appendTo(this._element);
        }
    }

    /**
     * getValue
     */
    public getValue(): string {
        return `${this._element.val() ?? ''}`;
    }

    /**
     * setValue
     * @param value
     */
    public setValue(value: string): void {
        this._element.val(value);
    }

    /**
     * onChange
     * @param fn - callback fired on user selection
     */
    public onChange(fn: (value: string) => void): void {
        this._onChange = fn;
    }

}

/**
 * FfxCheckboxRow — a labelled checkbox (node-membership toggles).
 */
export class FfxCheckboxRow extends Element {

    protected readonly _checkbox: JQuery;

    /**
     * @param label - the trailing label
     */
    public constructor(label: string) {
        super();
        this._element = jQuery('<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;cursor:pointer"></label>');
        this._checkbox = jQuery('<input type="checkbox">').appendTo(this._element);
        jQuery('<span></span>').text(label).appendTo(this._element);
    }

    /**
     * isChecked
     */
    public isChecked(): boolean {
        return this._checkbox.prop('checked');
    }

    /**
     * setChecked
     * @param checked
     */
    public setChecked(checked: boolean): void {
        this._checkbox.prop('checked', checked);
    }

    /**
     * setDisabled
     * @param disabled
     */
    public setDisabled(disabled: boolean): void {
        this._checkbox.prop('disabled', disabled);
    }

    /**
     * onChange
     * @param fn - callback fired on user toggle
     */
    public onChange(fn: () => void): void {
        this._checkbox.on('change', fn);
    }

}
