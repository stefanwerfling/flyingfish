import {
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    FormGroup,
    InputBottemBorderOnly2,
    InputType,
    SelectBottemBorderOnly2,
    Table,
    Td,
    Th,
    Tr
} from 'bambooo';
import {LogEntryItem} from 'flyingfish_schemas';
import {Log as LogAPI} from '../Api/Log.js';
import {BasePage} from './BasePage.js';

/**
 * Log — the central Log-Center page (observability epic): a filterable table of log records
 * collected from all FlyingFish components (netdevice, backend, nginx, dns, pki, …). Filter
 * by component area, level and a message substring; newest first. A "Live" toggle opens a
 * WebSocket (`/ws/logs`) and prepends matching records in real time.
 *
 * SECURITY: log messages/meta are UNTRUSTED (they can contain attacker-influenced text), so
 * every message/meta cell is filled via jQuery `.text()` (escaped) — never as HTML.
 */
export class Log extends BasePage {

    /**
     * Max rows kept in the DOM while live-streaming (older rows are dropped to bound memory).
     */
    private static readonly LIVE_MAX_ROWS = 500;

    /**
     * name
     * @protected
     */
    protected override _name: string = 'logs';

    protected _selectArea: SelectBottemBorderOnly2 | null = null;

    protected _selectLevel: SelectBottemBorderOnly2 | null = null;

    protected _inputText: InputBottemBorderOnly2 | null = null;

    protected _inputLimit: InputBottemBorderOnly2 | null = null;

    /**
     * Whether live streaming is enabled.
     * @protected
     */
    protected _live: boolean = false;

    /**
     * The open live WebSocket (or null).
     * @protected
     */
    protected _ws: WebSocket | null = null;

    /**
     * The jQuery tbody element of the current result table (live rows are prepended here).
     * @protected
     */
    protected _liveTbodyEl: JQuery | null = null;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Logs');
    }

    /**
     * Format a record's message cell text (message + compact meta), as a PLAIN string so the
     * caller can insert it escaped.
     * @param item - the log record
     */
    protected static _messageText(item: LogEntryItem): string {
        let message = item.message;

        if (item.meta !== undefined && item.meta !== null) {
            const metaStr = typeof item.meta === 'string' ? item.meta : JSON.stringify(item.meta);

            if (metaStr !== '' && metaStr !== '{}') {
                message += ` · ${metaStr.length > 300 ? `${metaStr.slice(0, 300)}…` : metaStr}`;
            }
        }

        return message;
    }

    /**
     * (Re)connect the live WebSocket to match the current filters, or close it when live is off.
     * @protected
     */
    protected _reconnectLive(): void {
        if (this._ws !== null) {
            try {
                this._ws.close();
            } catch {
                // ignore
            }

            this._ws = null;
        }

        if (!this._live || this._liveTbodyEl === null) {
            return;
        }

        const area = this._selectArea?.getSelectedValue() ?? '';
        const level = this._selectLevel?.getSelectedValue() ?? '';
        const text = this._inputText?.getValue() ?? '';

        const params = new URLSearchParams();

        if (area !== '') {
            params.set('areas', area);
        }

        if (level !== '') {
            params.set('levels', level);
        }

        if (text !== '') {
            params.set('text', text);
        }

        const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const tbodyEl = this._liveTbodyEl;

        const ws = new WebSocket(`${scheme}//${window.location.host}/ws/logs?${params.toString()}`);
        this._ws = ws;

        ws.onmessage = (event: MessageEvent): void => {
            let item: LogEntryItem;

            try {
                item = JSON.parse(event.data as string) as LogEntryItem;
            } catch {
                return;
            }

            const tr = jQuery('<tr/>');
            jQuery('<td/>').text(new Date(item.ts).toLocaleString()).appendTo(tr);
            jQuery('<td/>').text(item.area).appendTo(tr);
            jQuery('<td/>').text(item.level).appendTo(tr);
            jQuery('<td/>').text(Log._messageText(item)).appendTo(tr);
            tr.prependTo(tbodyEl);

            // Bound the DOM: drop rows beyond the live cap.
            const rows = tbodyEl.children();

            if (rows.length > Log.LIVE_MAX_ROWS) {
                rows.slice(Log.LIVE_MAX_ROWS).remove();
            }
        };
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();

        // Filter card (built once) ------------------------------------------------------------
        const filterCard = new Card(new ContentCol(content, ContentColSize.col12));
        filterCard.setTitle('Filter');

        const filterRow = new ContentRow(filterCard.getElement());

        const groupArea = new FormGroup(new ContentCol(filterRow, ContentColSize.colMd3), 'Area');
        this._selectArea = new SelectBottemBorderOnly2(groupArea);
        this._selectArea.setValues([{key: '', value: 'All areas'}]);
        this._selectArea.setChangeFn((): void => {
            if (this._onLoadTable !== null) {
                this._onLoadTable();
            }
        });

        const groupLevel = new FormGroup(new ContentCol(filterRow, ContentColSize.colMd3), 'Level');
        this._selectLevel = new SelectBottemBorderOnly2(groupLevel);
        this._selectLevel.setValues([
            {key: '', value: 'All levels'},
            {key: 'error', value: 'error'},
            {key: 'warn', value: 'warn'},
            {key: 'info', value: 'info'},
            {key: 'debug', value: 'debug'},
            {key: 'silly', value: 'silly'}
        ]);
        this._selectLevel.setChangeFn((): void => {
            if (this._onLoadTable !== null) {
                this._onLoadTable();
            }
        });

        const groupText = new FormGroup(new ContentCol(filterRow, ContentColSize.colMd4), 'Search message');
        this._inputText = new InputBottemBorderOnly2(groupText, 'logsearch', InputType.text);
        this._inputText.setPlaceholder('substring …');

        const groupLimit = new FormGroup(new ContentCol(filterRow, ContentColSize.colMd2), 'Max rows');
        this._inputLimit = new InputBottemBorderOnly2(groupLimit, 'loglimit', InputType.number);
        this._inputLimit.setValue('200');

        const btnRow = new ContentRow(filterCard.getElement());
        const btnCol = new ContentCol(btnRow, ContentColSize.col12);

        const btnApply = jQuery('<button type="button" class="btn btn-primary btn-sm">Apply</button>')
            .appendTo(btnCol.getElement());

        btnApply.on('click', (): void => {
            if (this._onLoadTable !== null) {
                this._onLoadTable();
            }
        });

        const liveLabel = jQuery('<label class="ml-3" style="font-weight:normal;cursor:pointer;"></label>')
            .appendTo(btnCol.getElement());
        const liveCheck = jQuery('<input type="checkbox" class="mr-1"/>').appendTo(liveLabel);
        jQuery('<span>Live</span>').appendTo(liveLabel);

        liveCheck.on('change', (): void => {
            this._live = liveCheck.is(':checked');
            this._reconnectLive();
        });

        // Result table card (rebuilt on each query) -------------------------------------------
        const tableCard = new Card(new ContentCol(content, ContentColSize.col12));

        this._onLoadTable = async(): Promise<void> => {
            tableCard.emptyBody();

            const area = this._selectArea?.getSelectedValue() ?? '';
            const level = this._selectLevel?.getSelectedValue() ?? '';
            const text = this._inputText?.getValue() ?? '';
            const limitRaw = parseInt(this._inputLimit?.getValue() ?? '200', 10);
            const limit = Number.isNaN(limitRaw) || limitRaw <= 0 ? 200 : limitRaw;

            const response = await LogAPI.query({
                areas: area === '' ? undefined : [area],
                levels: level === '' ? undefined : [level],
                text: text === '' ? undefined : text,
                limit: limit
            });

            const total = response.total ?? 0;
            const shown = response.items ? response.items.length : 0;
            tableCard.setTitle(`Log records (showing ${shown} of ${total})`);

            const table = new Table(tableCard.getElement());
            const trhead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(trhead, 'Time');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Area');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Level');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Message');

            if (response.items) {
                for (const item of response.items) {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, new Date(item.ts).toLocaleString());

                    // eslint-disable-next-line no-new
                    new Td(trbody, item.area);

                    // eslint-disable-next-line no-new
                    new Td(trbody, item.level);

                    // message/meta are UNTRUSTED → insert as escaped text, never HTML.
                    const tdMessage = new Td(trbody, '');
                    tdMessage.getElement().text(Log._messageText(item));
                }
            }

            // The live stream prepends into this table's tbody; reconnect it to the new filters.
            this._liveTbodyEl = table.getTbody();
            this._reconnectLive();
        };

        // Populate the area filter from the distinct areas currently stored.
        try {
            const areas = await LogAPI.getAreas();

            if (areas.areas) {
                for (const area of areas.areas) {
                    this._selectArea.addValue({key: area, value: area});
                }
            }
        } catch {
            // best-effort: the filter still works with "All areas" if the list can't load
        }

        await this._onLoadTable();
    }

    /**
     * unloadContent — close the live WebSocket when leaving the page.
     */
    public override unloadContent(): void {
        this._live = false;

        if (this._ws !== null) {
            try {
                this._ws.close();
            } catch {
                // ignore
            }

            this._ws = null;
        }
    }

}
