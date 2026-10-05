import {AUiPlugin} from '@stefanwerfling/figtree';
import {SchemaErrors} from 'vts';
import {PluginConfig} from '../Db/MariaDb/Entity/PluginConfig.js';
import {PluginConfigService} from '../Db/MariaDb/Service/PluginConfigService.js';
import {Logger} from '../Logger/Logger.js';
import {fieldsToVts} from './fieldsToVts.js';

/**
 * AFlyingFishPlugin — the FlyingFish base class for plugins WITH a config UI.
 * Extends figtree's {@link AUiPlugin} with a DB-backed key/value store for the
 * plugin config-UI feature (9.9.x), so a plugin that declares a UI via
 * {@link AUiPlugin.getUiSchema} gets persistence of its values for free.
 *
 * Plugins without a UI keep extending figtree's `APlugin` directly. Persistence
 * here is keyed by the plugin manifest name (`definition.name`) and lives in the
 * `plugin_config` table. A plugin with dynamic config (e.g. values not
 * expressible as a static field list) may still override getData/setData.
 */
export abstract class AFlyingFishPlugin extends AUiPlugin {

    /**
     * The canonical key used for this plugin's config/enabled row: the manifest
     * name, which is also how the PluginManager addresses the plugin.
     * @protected
     * @returns {string}
     */
    protected _configName(): string {
        return this._info.name;
    }

    /**
     * Return the plugin's current config values, keyed by the field `key`s of
     * {@link AUiPlugin.getUiSchema}. Missing stored values fall back to the
     * field default from the schema.
     * @returns {Promise<Record<string, unknown>>}
     */
    public override async getData(): Promise<Record<string, unknown>> {
        const row = await PluginConfigService.getInstance().findByName(this._configName());

        let stored: Record<string, unknown> = {};

        if (row && row.data) {
            try {
                stored = JSON.parse(row.data) as Record<string, unknown>;
            } catch (e) {
                Logger.getLogger().warn('AFlyingFishPlugin::getData: invalid stored JSON for %s', this._configName());
            }
        }

        const out: Record<string, unknown> = {};

        for (const field of this.getUiSchema()) {
            out[field.key] = Object.prototype.hasOwnProperty.call(stored, field.key)
                ? stored[field.key]
                : field.default;
        }

        return out;
    }

    /**
     * Validate the given values against the plugin's UI schema and persist them.
     * Invalid values are rejected (returns false).
     * @param {Record<string, unknown>} values
     * @returns {Promise<boolean>} true when accepted and stored.
     */
    public override async setData(values: Record<string, unknown>): Promise<boolean> {
        const errors: SchemaErrors = [];

        if (!fieldsToVts(this.getUiSchema()).validate(values, errors)) {
            Logger.getLogger().warn(
                'AFlyingFishPlugin::setData: validation failed for %s: %j',
                this._configName(),
                errors
            );

            return false;
        }

        const service = PluginConfigService.getInstance();

        let row = await service.findByName(this._configName());

        if (row === null) {
            row = new PluginConfig();
            row.plugin_name = this._configName();
            row.enabled = true;
        }

        row.data = JSON.stringify(values);

        await service.save(row);

        return true;
    }

}
