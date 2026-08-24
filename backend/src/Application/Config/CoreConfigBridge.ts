import {BackendConfigOptions, SchemaBackendConfigOptions} from 'flyingfish_schemas';
import {Config as ConfigCore} from 'flyingfish_core';
import {FlyingFishConfig} from './FlyingFishConfig.js';

/**
 * Bridge that seats the flyingfish_core `Config` singleton so core consumers
 * (core `Logger`, core DB services) read the configuration that the figtree
 * boot loads into `FlyingFishConfig`. `get()` simply delegates there.
 *
 * This replaces the former heavy backend `Config` subclass whose
 * `_loadEnv`/`_setDefaults` duplicated `FlyingFishConfig` and were dormant.
 */
export class CoreConfigBridge extends ConfigCore<BackendConfigOptions> {

    /**
     * Seat this bridge as the flyingfish_core `Config` singleton (idempotent).
     * Call once during startup before any core consumer reads its config.
     */
    public static seat(): void {
        if (!ConfigCore._instance) {
            ConfigCore._instance = new CoreConfigBridge(SchemaBackendConfigOptions);
        }
    }

    /**
     * @inheritDoc
     */
    public override get(): BackendConfigOptions | null {
        return FlyingFishConfig.getInstance().get();
    }

}