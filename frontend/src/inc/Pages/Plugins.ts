import {
    Button,
    ButtonClass,
    ButtonType,
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    SchemaForm,
    SchemaFormField,
    Switch,
    Table,
    Td,
    Th,
    Tr
} from 'bambooo';
import {PluginListEntry} from 'flyingfish_schemas';
import {Plugin as PluginAPI} from '../Api/Plugin.js';
import {FfrModal} from '../Components/FfrModal.js';
import {BasePage} from './BasePage.js';

/**
 * Plugins page — plugin config-UI (9.9.x). Lists the discovered plugins with an
 * enable/disable toggle and, for plugins that expose a UI, a Configure action
 * that opens a modal rendering the plugin's declarative schema via SchemaForm.
 */
export class Plugins extends BasePage {

    /**
     * name
     * @protected
     */
    protected override _name: string = 'plugins';

    /**
     * Shared config modal (reused per plugin).
     * @protected
     */
    protected _modal: FfrModal;

    /**
     * The SchemaForm currently shown in the modal.
     * @protected
     */
    protected _form: SchemaForm|null = null;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Plugins');

        this._modal = new FfrModal('Plugin configuration', 'Save');
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();

        this._onLoadTable = async(): Promise<void> => {
            content.empty();

            const list = await PluginAPI.getList();

            const row = new ContentRow(content);
            const card = new Card(new ContentCol(row, ContentColSize.col12));
            card.setTitle('Plugins');

            const cardBody = jQuery('<div class="card-body"/>').appendTo(card.getElement());

            const table = new Table(cardBody);
            const trhead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(trhead, 'Name');
            // eslint-disable-next-line no-new
            new Th(trhead, 'Version', '120px');
            // eslint-disable-next-line no-new
            new Th(trhead, 'Description');
            // eslint-disable-next-line no-new
            new Th(trhead, 'Enabled', '120px');
            // eslint-disable-next-line no-new
            new Th(trhead, 'Action', '160px');

            for (const entry of list) {
                const tr = new Tr(table.getTbody());

                // eslint-disable-next-line no-new
                new Td(tr, `${entry.name}`);
                // eslint-disable-next-line no-new
                new Td(tr, `${entry.version}`);
                // eslint-disable-next-line no-new
                new Td(tr, `${entry.description}`);

                const tdEnabled = new Td(tr, '');
                const sw = new Switch(tdEnabled, `enable_${entry.name}`);
                sw.setEnable(entry.enabled);
                sw.setChangeFn((value): void => {
                    void this._toggleEnable(entry.name, value);
                });

                const tdAction = new Td(tr, '');

                if (entry.hasUi) {
                    const btn = new Button(tdAction, ButtonType.default, ButtonClass.primary);
                    btn.getElement().append('Configure');
                    btn.setOnClickFn((): void => {
                        void this._openConfig(entry);
                    });
                } else {
                    tdAction.getElement().append(entry.loaded ? '<span class="text-muted">—</span>' : '<span class="text-muted">disabled</span>');
                }
            }
        };

        await this._onLoadTable();
    }

    /**
     * Toggle a plugin's enabled state and reload the list.
     * @protected
     * @param {string} name
     * @param {boolean} enabled
     */
    protected async _toggleEnable(name: string, enabled: boolean): Promise<void> {
        try {
            await PluginAPI.setEnable(name, enabled);
        } finally {
            if (this._onLoadTable) {
                await this._onLoadTable();
            }
        }
    }

    /**
     * Open the config modal for a plugin: load its UI schema + current values,
     * render a SchemaForm, and wire the save action.
     * @protected
     * @param {PluginListEntry} entry
     */
    protected async _openConfig(entry: PluginListEntry): Promise<void> {
        const res = await PluginAPI.getUi(entry.name);

        const body = this._modal.getBody().empty();

        this._modal.setTitle(`Configure: ${entry.name}`);

        const fields: SchemaFormField[] = res.ui ?? [];

        this._form = new SchemaForm(body, fields);

        if (res.data) {
            this._form.setValues(res.data);
        }

        this._modal.setOnSave((): void => {
            void this._saveConfig(entry.name);
        });

        this._modal.show();
    }

    /**
     * Persist the current form values for a plugin and close the modal.
     * @protected
     * @param {string} name
     */
    protected async _saveConfig(name: string): Promise<void> {
        if (this._form === null) {
            return;
        }

        await PluginAPI.saveData(name, this._form.getValues());

        this._modal.hide();

        if (this._onLoadTable) {
            await this._onLoadTable();
        }
    }

}
