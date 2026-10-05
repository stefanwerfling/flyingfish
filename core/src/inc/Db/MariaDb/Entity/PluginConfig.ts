import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * PluginConfig — node-LOCAL per-plugin state for the plugin config-UI feature
 * (9.9.x). ONE ROW PER PLUGIN, keyed by the plugin manifest name
 * (`definition.name`, the same handle the PluginManager addresses a plugin by).
 *
 * Holds two things:
 *  - `enabled`: whether the plugin is activated. Loading at boot is gated by the
 *    plugin SIGNATURE (distHash), not by this flag; this flag is applied at
 *    runtime (after the DB is up) to disable/enable a loaded plugin — the DB is
 *    not available yet when the PluginManager runs its boot scan/load.
 *  - `data`: the plugin's config values as a JSON blob, validated against the
 *    plugin's declarative UI schema (see AFlyingFishPlugin + fieldsToVts).
 */
@Entity({name: 'plugin_config'})
export class PluginConfig extends DBBaseEntityId {

    /**
     * Plugin manifest name (`definition.name`). Unique — one config row per plugin.
     */
    @Index({unique: true})
    @Column({
        type: 'varchar',
        length: 255
    })
    public plugin_name!: string;

    /**
     * Whether the plugin is activated. Default on for a freshly discovered plugin.
     */
    @Column({
        type: 'bool',
        default: true
    })
    public enabled!: boolean;

    /**
     * Config values as a JSON object string. Empty until the plugin is configured.
     */
    @Column({
        type: 'text',
        default: ''
    })
    public data!: string;

}
