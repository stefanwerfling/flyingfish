import {DBSetupHook} from '@stefanwerfling/figtree';
import {PluginActions} from '../../../Routes/Main/Plugin/PluginActions.js';

/**
 * PluginEnableReconcileHook
 *
 * Applies the persisted per-plugin `enabled` flags to the running PluginManager
 * (plugin config-UI, 9.9.x). Loading of plugins is gated by their SIGNATURE and
 * happens in PluginService.start() BEFORE the database is up, so every signed
 * plugin is loaded at boot regardless of its enabled flag. Once the DB is
 * available this hook reads `plugin_config` and unloads the plugins marked
 * disabled, bringing the runtime in line with the stored intent.
 *
 * Must run after `CoreDBConnectHook` (needs DBService connected). `mode: 'always'`
 * — it reconciles on every boot and is idempotent.
 */
export class PluginEnableReconcileHook implements DBSetupHook {

    /**
     * Hook identifier.
     */
    public readonly id = 'flyingfish-plugin-enable-reconcile';

    /**
     * Run on every boot (idempotent).
     */
    public readonly mode = 'always' as const;

    /**
     * Disable the plugins marked disabled in the store.
     */
    public async run(): Promise<void> {
        await PluginActions.reconcileEnabled();
    }

}
