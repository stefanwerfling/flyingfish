import './ffr-dialog.css';

/**
 * FfrModal — a reusable modal dialog in the FlyingFish `.ffr` design language (see
 * ffr-dialog.css). Rendered as an overlay appended to <body>, independent of admin-lte's
 * bootstrap modals, so router dialogs match the Router page's look (sectioned form,
 * segmented controls, switches, mono inputs). A first-in-FlyingFish widget set intended to
 * graduate into bambooo later.
 *
 * Compose the body with {@link FfrSection} + {@link FfrField} + the control widgets.
 */
export class FfrModal {

    protected readonly _overlay: JQuery;

    protected readonly _title: JQuery;

    protected readonly _body: JQuery;

    protected readonly _saveBtn: JQuery;

    protected _onSave: (() => void) | null = null;

    /**
     * @param titleText - the initial dialog title
     * @param saveLabel - the primary button label (default "Save changes")
     */
    public constructor(titleText: string = '', saveLabel: string = 'Save changes') {
        this._overlay = jQuery('<div class="ffr-modal"></div>').appendTo(document.body);
        const dlg = jQuery('<div class="ffr-dlg"></div>').appendTo(this._overlay);

        const top = jQuery('<div class="ffr-dlg-top"></div>').appendTo(dlg);
        this._title = jQuery(`<h4>${FfrModal.esc(titleText)}</h4>`).appendTo(top);
        const x = jQuery('<span class="ffr-dlg-x">✕</span>').appendTo(top);

        this._body = jQuery('<div class="ffr-dlg-body"></div>').appendTo(dlg);

        const foot = jQuery('<div class="ffr-dlg-foot"></div>').appendTo(dlg);
        const cancel = jQuery('<button class="ffr-btn" type="button">Cancel</button>').appendTo(foot);
        this._saveBtn = jQuery(`<button class="ffr-btn ffr-primary" type="button">${FfrModal.esc(saveLabel)}</button>`).appendTo(foot);

        x.on('click', () => this.hide());
        cancel.on('click', () => this.hide());
        this._overlay.on('click', (event) => {
            // backdrop click (outside the dialog card) closes
            if (event.target === this._overlay[0]) {
                this.hide();
            }
        });
        this._saveBtn.on('click', () => {
            if (this._onSave) {
                this._onSave();
            }
        });
    }

    /**
     * The dialog body element — append {@link FfrSection}s here.
     */
    public getBody(): JQuery {
        return this._body;
    }

    /**
     * setTitle
     * @param text - the dialog title
     */
    public setTitle(text: string): void {
        this._title.text(text);
    }

    /**
     * setSaveLabel
     * @param text - the primary button label
     */
    public setSaveLabel(text: string): void {
        this._saveBtn.text(text);
    }

    /**
     * setOnSave — the primary button handler.
     * @param fn - callback
     */
    public setOnSave(fn: () => void): void {
        this._onSave = fn;
    }

    /**
     * Empty the body (to rebuild fields).
     */
    public clearBody(): void {
        this._body.empty();
    }

    /**
     * show
     */
    public show(): void {
        this._overlay.addClass('ffr-open');
    }

    /**
     * hide
     */
    public hide(): void {
        this._overlay.removeClass('ffr-open');
    }

    /**
     * Minimal HTML escape for interpolated text.
     * @param value - raw text
     */
    public static esc(value: string): string {
        return jQuery('<div></div>').text(value).html();
    }

}

/**
 * FfrSection — a titled form section (fieldset + uppercase legend).
 */
export class FfrSection {

    public readonly element: JQuery;

    /**
     * @param parent - the modal body
     * @param legend - the section title
     */
    public constructor(parent: JQuery, legend: string) {
        this.element = jQuery(`<fieldset class="ffr-fs"><legend>${FfrModal.esc(legend)}</legend></fieldset>`).appendTo(parent);
    }

}

/**
 * FfrField — a labelled field wrapper (label + control + optional help). Returns the inner
 * element to place a control into via {@link FfrField.mount}.
 */
export class FfrField {

    public readonly element: JQuery;

    protected readonly _help: JQuery | null;

    /**
     * @param parent - a section (or a `.ffr-row`) to append into
     * @param label - the field label
     * @param helpHtml - optional help text (HTML allowed for `<code>`); null for none
     */
    public constructor(parent: JQuery, label: string, helpHtml: string | null = null) {
        this.element = jQuery('<div class="ffr-field"></div>').appendTo(parent);
        jQuery(`<label class="ffr-lbl">${FfrModal.esc(label)}</label>`).appendTo(this.element);
        this._help = helpHtml === null ? null : jQuery(`<div class="ffr-help">${helpHtml}</div>`);
    }

    /**
     * Mount a control element between the label and the help line.
     * @param control - the control's root element
     * @returns {this}
     */
    public mount(control: JQuery): this {
        control.appendTo(this.element);

        if (this._help !== null) {
            this._help.appendTo(this.element);
        }

        return this;
    }

    /**
     * Create a two-column row container inside a section.
     * @param parent - the section
     * @returns {JQuery} the row element
     */
    public static row(parent: JQuery): JQuery {
        return jQuery('<div class="ffr-row"></div>').appendTo(parent);
    }

}

/**
 * FfrSegmented — a segmented control (2–3 mutually-exclusive choices) replacing a select.
 */
export class FfrSegmented {

    public readonly element: JQuery;

    protected _value: string;

    protected _onChange: ((value: string) => void) | null = null;

    /**
     * @param options - the choices ({key, label})
     * @param initial - the initially-selected key
     */
    public constructor(options: {key: string; label: string;}[], initial: string) {
        this.element = jQuery('<div class="ffr-seg"></div>');
        this._value = initial;

        for (const opt of options) {
            const btn = jQuery(`<button type="button">${FfrModal.esc(opt.label)}</button>`).appendTo(this.element);
            btn.attr('data-key', opt.key);

            if (opt.key === initial) {
                btn.addClass('ffr-active');
            }

            btn.on('click', () => this._select(opt.key));
        }
    }

    /**
     * @param key - the key to select
     * @protected
     */
    protected _select(key: string): void {
        this._value = key;
        this.element.children('button').each((_, el) => {
            jQuery(el).toggleClass('ffr-active', jQuery(el).attr('data-key') === key);
        });

        if (this._onChange !== null) {
            this._onChange(key);
        }
    }

    /**
     * getValue
     */
    public getValue(): string {
        return this._value;
    }

    /**
     * setValue
     * @param key - the key to select (no onChange fired)
     */
    public setValue(key: string): void {
        this._value = key;
        this.element.children('button').each((_, el) => {
            jQuery(el).toggleClass('ffr-active', jQuery(el).attr('data-key') === key);
        });
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
 * FfrSwitch — a toggle switch with a trailing label.
 */
export class FfrSwitch {

    public readonly element: JQuery;

    protected readonly _track: JQuery;

    protected _on: boolean;

    /**
     * @param label - the trailing label
     * @param initial - initial on-state
     */
    public constructor(label: string, initial: boolean) {
        this._on = initial;
        this.element = jQuery('<label class="ffr-switch"></label>');
        this._track = jQuery('<span class="ffr-track"></span>').appendTo(this.element);
        jQuery(document.createTextNode(` ${label}`)).appendTo(this.element);

        if (!initial) {
            this._track.addClass('ffr-off');
        }

        this.element.on('click', (event) => {
            event.preventDefault();
            this.setOn(!this._on);
        });
    }

    /**
     * isOn
     */
    public isOn(): boolean {
        return this._on;
    }

    /**
     * setOn
     * @param on - the on-state
     */
    public setOn(on: boolean): void {
        this._on = on;
        this._track.toggleClass('ffr-off', !on);
    }

}

/**
 * FfrSelect — a styled native dropdown for choices too many for a segmented control
 * (roles, modes, the detected-NIC picker).
 */
export class FfrSelect {

    public readonly element: JQuery;

    protected _onChange: ((value: string) => void) | null = null;

    /**
     * @param mono - use the monospace font for the options
     */
    public constructor(mono: boolean = false) {
        this.element = jQuery('<select class="ffr-inp ffr-select"></select>');

        if (mono) {
            this.element.addClass('ffr-mono');
        }

        this.element.on('change', () => {
            if (this._onChange !== null) {
                this._onChange(this.getSelectedValue());
            }
        });
    }

    /**
     * Replace the options.
     * @param options - {key, value} list (key = the stored value, value = the label)
     */
    public setValues(options: {key: string; value: string;}[]): void {
        this.element.empty();

        for (const opt of options) {
            const el = jQuery('<option></option>').attr('value', opt.key).text(opt.value);
            el.appendTo(this.element);
        }
    }

    /**
     * getSelectedValue
     */
    public getSelectedValue(): string {
        return `${this.element.val() ?? ''}`;
    }

    /**
     * setSelectedValue
     * @param value - the option key to select
     */
    public setSelectedValue(value: string): void {
        this.element.val(value);
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
 * FfrInput — a styled text input (optionally monospace for addresses/ports).
 */
export class FfrInput {

    public readonly element: JQuery;

    /**
     * @param mono - use the monospace font (addresses/ports)
     * @param placeholder - optional placeholder
     */
    public constructor(mono: boolean = false, placeholder: string = '') {
        this.element = jQuery('<input type="text" class="ffr-inp"></input>');

        if (mono) {
            this.element.addClass('ffr-mono');
        }

        if (placeholder !== '') {
            this.element.attr('placeholder', placeholder);
        }
    }

    /**
     * getValue (trimmed)
     */
    public getValue(): string {
        return `${this.element.val() ?? ''}`.trim();
    }

    /**
     * setValue
     * @param value - the value
     */
    public setValue(value: string): void {
        this.element.val(value);
    }

}
