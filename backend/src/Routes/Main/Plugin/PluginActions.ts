import {
    AUiPlugin,
    Logger,
    PluginConfigDB,
    PluginConfigServiceDB,
    PluginManager
} from 'flyingfish_core';
import {
    DefaultReturn,
    PluginDataSaveRequest,
    PluginEnableRequest,
    PluginListEntry,
    PluginListResponse,
    PluginNameRequest,
    PluginUiResponse,
    StatusCodes
} from 'flyingfish_schemas';

/**
 * PluginActions — data access for the plugin config-UI routes (9.9.x). Reads the
 * discovered plugins from the figtree PluginManager and their enabled/config
 * state from the `plugin_config` store.
 */
export class PluginActions {

    /**
     * List every discovered (signed) plugin with its enabled/loaded/hasUi state.
     * @returns {Promise<PluginListResponse>}
     */
    public static async getList(): Promise<PluginListResponse> {
        const pm = PluginManager.getInstance();
        const service = PluginConfigServiceDB.getInstance();
        const list: PluginListEntry[] = [];

        for (const info of pm.getInformations()) {
            const name = info.definition.name;
            const loaded = pm.getLoadedPlugin(name);
            // eslint-disable-next-line no-await-in-loop
            const row = await service.findByName(name);

            list.push({
                name: name,
                description: info.definition.description,
                version: info.definition.version,
                enabled: row ? row.enabled : true,
                loaded: loaded !== null,
                hasUi: loaded instanceof AUiPlugin
            });
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

    /**
     * Return a plugin's declarative UI field list and its current config values.
     * @param {PluginNameRequest} req
     * @returns {Promise<PluginUiResponse>}
     */
    public static async getUi(req: PluginNameRequest): Promise<PluginUiResponse> {
        const plugin = PluginManager.getInstance().getLoadedPlugin(req.name);

        if (!(plugin instanceof AUiPlugin)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: `Plugin not loaded or has no UI: ${req.name}`
            };
        }

        return {
            statusCode: StatusCodes.OK,
            ui: plugin.getUiSchema(),
            data: await plugin.getData()
        };
    }

    /**
     * Validate and persist a plugin's config values.
     * @param {PluginDataSaveRequest} req
     * @returns {Promise<DefaultReturn>}
     */
    public static async saveData(req: PluginDataSaveRequest): Promise<DefaultReturn> {
        const plugin = PluginManager.getInstance().getLoadedPlugin(req.name);

        if (!(plugin instanceof AUiPlugin)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: `Plugin not loaded or has no UI: ${req.name}`
            };
        }

        const ok = await plugin.setData(req.data);

        if (!ok) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Config values rejected (validation failed)'
            };
        }

        return {
            statusCode: StatusCodes.OK
        };
    }

    /**
     * Enable or disable a plugin: persist the flag and apply it to the runtime
     * (load / unload). Signature-gating of the load is unaffected — only
     * already-discovered (signed) plugins can be toggled.
     * @param {PluginEnableRequest} req
     * @returns {Promise<DefaultReturn>}
     */
    public static async setEnable(req: PluginEnableRequest): Promise<DefaultReturn> {
        const pm = PluginManager.getInstance();

        const info = pm.getInformations().find((e) => e.definition.name === req.name);

        if (!info) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: `Plugin not found: ${req.name}`
            };
        }

        const service = PluginConfigServiceDB.getInstance();

        let row = await service.findByName(req.name);

        if (row === null) {
            row = new PluginConfigDB();
            row.plugin_name = req.name;
            row.data = '';
        }

        row.enabled = req.enabled;

        await service.save(row);

        if (req.enabled) {
            await pm.enablePlugin(req.name);
        } else {
            await pm.disablePlugin(req.name);
        }

        return {
            statusCode: StatusCodes.OK
        };
    }

    /**
     * Apply the persisted enabled flags to the runtime after boot: unload every
     * plugin marked disabled. Loading itself is signature-gated and happens
     * before the DB is up, so this reconciliation runs once the DB is available.
     */
    public static async reconcileEnabled(): Promise<void> {
        const pm = PluginManager.getInstance();
        const rows = await PluginConfigServiceDB.getInstance().findAll();

        for (const row of rows) {
            if (!row.enabled) {
                Logger.getLogger().info('PluginActions::reconcileEnabled: disabling %s', row.plugin_name);
                // eslint-disable-next-line no-await-in-loop
                await pm.disablePlugin(row.plugin_name);
            }
        }
    }

}
